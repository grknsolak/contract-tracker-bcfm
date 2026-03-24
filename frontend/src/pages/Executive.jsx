import React, { useMemo, useState } from "react";
import { daysUntil, formatCurrency } from "../utils/date";
import { getCustomerTier } from "../utils/customerTier";
import { getRenewalRates } from "../utils/pricing";
import { normalizeStage } from "../utils/status";

// ── Helpers ───────────────────────────────────────────────────────────────────
function toUSD(value, currency, usdRate) {
  if (!value) return 0;
  if (currency === "TL" || currency === "TRY") return value / usdRate;
  return Number(value) || 0;
}

function fmtUSD(value) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${Math.round(value)}`;
}

function fmtPct(n) {
  return `${n.toFixed(1)}%`;
}

const TIER_CFG = {
  "A+": { color: "#C4912A", bg: "rgba(196,145,42,0.14)" },
  "A":  { color: "#8E9BAD", bg: "rgba(142,155,173,0.14)" },
  "B":  { color: "#6EE7B7", bg: "rgba(110,231,183,0.12)" },
  "C":  { color: "#93C5FD", bg: "rgba(147,197,253,0.12)" },
};

const RANK_CFG = [
  { bg: "rgba(196,145,42,0.18)", color: "#DBA84A", border: "rgba(196,145,42,0.35)", label: "1" },
  { bg: "rgba(148,163,184,0.15)", color: "#94A3B8", border: "rgba(148,163,184,0.3)", label: "2" },
  { bg: "rgba(180,130,90,0.15)", color: "#C8956A", border: "rgba(180,130,90,0.3)", label: "3" },
];

const PIPELINE_STAGES = new Set(["Draft", "Legal Review", "Signature", "Renewal Protocol"]);

// ── Core metrics computation ───────────────────────────────────────────────────
function useTeamMetrics(contracts, usdRate) {
  return useMemo(() => {
    const totalUSD = contracts.reduce((s, c) => s + toUSD(c.value, c.currency, usdRate), 0);

    // Customer → cumulative USD value (across ALL contracts, for tier calc)
    const customerUSD = {};
    contracts.forEach((c) => {
      customerUSD[c.customerName] = (customerUSD[c.customerName] || 0) + toUSD(c.value, c.currency, usdRate);
    });

    // Group by team
    const grouped = {};
    contracts.forEach((c) => {
      const team = c.team || "Unassigned";
      if (!grouped[team]) grouped[team] = [];
      grouped[team].push(c);
    });

    const rows = Object.entries(grouped).map(([team, tc]) => {
      const teamUSD = tc.reduce((s, c) => s + toUSD(c.value, c.currency, usdRate), 0);
      const pct = totalUSD > 0 ? (teamUSD / totalUSD) * 100 : 0;

      // Customers
      const customers = new Set(tc.map((c) => c.customerName));

      // Renewal rates
      const rates = [];
      tc.forEach((c) => {
        const r = getRenewalRates(c);
        (c.scopes || []).forEach((s) => {
          const v = Number(r[s] || 0);
          if (v > 0) rates.push(v);
        });
      });
      const avgRate = rates.length ? Math.round(rates.reduce((s, r) => s + r, 0) / rates.length) : 0;

      // Status counts
      const atRisk = tc.filter((c) => {
        const d = daysUntil(c.endDate);
        return typeof d === "number" && d >= 0 && d <= 30;
      }).length;

      const inPipeline = tc.filter((c) => PIPELINE_STAGES.has(normalizeStage(c.stage))).length;

      const churnedCustomers = new Set(
        tc.filter((c) => daysUntil(c.endDate) < 0 || c.renewalStatus === "Lost")
           .map((c) => c.customerName)
      ).size;

      // Top customer in team
      const custTeamUSD = {};
      tc.forEach((c) => {
        custTeamUSD[c.customerName] = (custTeamUSD[c.customerName] || 0) + toUSD(c.value, c.currency, usdRate);
      });
      const [topName, topVal] = Object.entries(custTeamUSD).sort((a, b) => b[1] - a[1])[0] || ["—", 0];

      // Tier counts (global portfolio share)
      const tierCounts = { "A+": 0, "A": 0, "B": 0, "C": 0 };
      [...customers].forEach((name) => {
        const t = getCustomerTier(customerUSD[name] || 0, totalUSD);
        if (t?.label) tierCounts[t.label] = (tierCounts[t.label] || 0) + 1;
      });

      // MoM trend — compare newest vs 2nd newest contract start year
      const years = [...new Set(tc.map((c) => c.startDate?.slice(0, 4)).filter(Boolean))].sort();
      let trend = null;
      if (years.length >= 2) {
        const thisYearUSD = tc.filter((c) => c.startDate?.startsWith(years[years.length - 1]))
          .reduce((s, c) => s + toUSD(c.value, c.currency, usdRate), 0);
        const prevYearUSD = tc.filter((c) => c.startDate?.startsWith(years[years.length - 2]))
          .reduce((s, c) => s + toUSD(c.value, c.currency, usdRate), 0);
        if (prevYearUSD > 0) trend = ((thisYearUSD - prevYearUSD) / prevYearUSD) * 100;
      }

      return {
        team, teamUSD, pct, customerCount: customers.size,
        contractCount: tc.length, avgRate, atRisk,
        inPipeline, churnedCustomers, topName, topVal,
        tierCounts, trend,
      };
    });

    rows.sort((a, b) => b.teamUSD - a.teamUSD);

    // Company-wide
    const allRates = [];
    contracts.forEach((c) => {
      const r = getRenewalRates(c);
      (c.scopes || []).forEach((s) => {
        const v = Number(r[s] || 0);
        if (v > 0) allRates.push(v);
      });
    });
    const companyAvgRate = allRates.length ? Math.round(allRates.reduce((s, r) => s + r, 0) / allRates.length) : 0;
    const activeContracts = contracts.filter((c) => normalizeStage(c.stage) !== "Expired" && c.renewalStatus !== "Lost").length;
    const atRiskTotal = contracts.filter((c) => { const d = daysUntil(c.endDate); return typeof d === "number" && d >= 0 && d <= 30; }).length;
    const uniqueCustomers = new Set(contracts.map((c) => c.customerName)).size;

    return { rows, totalUSD, companyAvgRate, activeContracts, atRiskTotal, uniqueCustomers };
  }, [contracts, usdRate]);
}

// ── Mini SVG bar chart (horizontal) ──────────────────────────────────────────
function HorizBar({ value, max, color = "var(--primary)", height = 6 }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="exec-hbar-track" style={{ height }}>
      <div className="exec-hbar-fill" style={{ width: `${pct}%`, background: color, height }} />
    </div>
  );
}

// ── Rate color helper ─────────────────────────────────────────────────────────
function rateColor(r) {
  if (r >= 25) return "var(--success)";
  if (r >= 12) return "var(--primary)";
  if (r > 0)  return "var(--warning)";
  return "var(--muted)";
}

// ── Trend chip ────────────────────────────────────────────────────────────────
function TrendChip({ trend }) {
  if (trend === null) return null;
  const up = trend >= 0;
  return (
    <span className={`exec-trend${up ? " exec-trend--up" : " exec-trend--down"}`}>
      {up ? (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
      ) : (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      )}
      {Math.abs(trend).toFixed(0)}%
    </span>
  );
}

// ── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, tone }) {
  return (
    <div className={`exec-kpi${tone ? ` exec-kpi--${tone}` : ""}`}>
      <div className="exec-kpi-value">{value}</div>
      <div className="exec-kpi-label">{label}</div>
      {sub && <div className="exec-kpi-sub">{sub}</div>}
    </div>
  );
}

// ── Team card ─────────────────────────────────────────────────────────────────
function TeamCard({ row, rank, maxUSD, onNavigate }) {
  const rankCfg = RANK_CFG[rank] || null;

  return (
    <div className="exec-team-card">
      {/* Header */}
      <div className="exec-team-header">
        <div className="exec-team-name-row">
          {rankCfg && (
            <span className="exec-rank-badge" style={{ background: rankCfg.bg, color: rankCfg.color, borderColor: rankCfg.border }}>
              #{rankCfg.label}
            </span>
          )}
          <span className="exec-team-name">{row.team}</span>
          <TrendChip trend={row.trend} />
        </div>
        <span className="exec-team-value">{fmtUSD(row.teamUSD)}</span>
      </div>

      {/* Portfolio share bar */}
      <div className="exec-pct-row">
        <HorizBar value={row.teamUSD} max={maxUSD} color={rankCfg?.color || "var(--primary)"} height={5} />
        <span className="exec-pct-label">{fmtPct(row.pct)} of portfolio</span>
      </div>

      {/* Core metrics */}
      <div className="exec-metrics-row">
        <div className="exec-metric-cell">
          <span className="exec-metric-val">{row.customerCount}</span>
          <span className="exec-metric-key">Customers</span>
        </div>
        <div className="exec-metric-sep" />
        <div className="exec-metric-cell">
          <span className="exec-metric-val">{row.contractCount}</span>
          <span className="exec-metric-key">Contracts</span>
        </div>
        <div className="exec-metric-sep" />
        <div className="exec-metric-cell">
          <span className="exec-metric-val" style={{ color: rateColor(row.avgRate) }}>
            {row.avgRate > 0 ? `+${row.avgRate}%` : "—"}
          </span>
          <span className="exec-metric-key">Avg Renewal</span>
        </div>
      </div>

      {/* Tier breakdown */}
      <div className="exec-tiers">
        {Object.entries(TIER_CFG).map(([label, cfg]) => (
          <span key={label} className="exec-tier-chip" style={{ color: cfg.color, background: cfg.bg }}>
            {label} <strong>{row.tierCounts[label] || 0}</strong>
          </span>
        ))}
      </div>

      {/* Risk + pipeline */}
      <div className="exec-status-row">
        {row.atRisk > 0 && (
          <span className="exec-status-chip exec-status-chip--danger">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            {row.atRisk} at risk
          </span>
        )}
        {row.inPipeline > 0 && (
          <span className="exec-status-chip exec-status-chip--info">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            {row.inPipeline} pipeline
          </span>
        )}
        {row.churnedCustomers > 0 && (
          <span className="exec-status-chip exec-status-chip--muted">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            {row.churnedCustomers} churned
          </span>
        )}
      </div>

      {/* Top customer */}
      {row.topName && row.topName !== "—" && (
        <div className="exec-top-customer">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          <span className="exec-top-name">{row.topName}</span>
          <span className="exec-top-val">{fmtUSD(row.topVal)}</span>
        </div>
      )}
    </div>
  );
}

// ── Revenue chart ─────────────────────────────────────────────────────────────
function RevenueChart({ rows }) {
  const max = Math.max(...rows.map((r) => r.teamUSD), 1);
  return (
    <div className="exec-chart-card">
      <div className="exec-chart-title">Revenue by Team</div>
      <div className="exec-chart-sub">Total contract value in USD</div>
      <div className="exec-chart-body">
        {rows.map((row, i) => {
          const cfg = RANK_CFG[i] || { color: "var(--primary)" };
          const pct = (row.teamUSD / max) * 100;
          return (
            <div key={row.team} className="exec-chart-row">
              <span className="exec-chart-label">{row.team}</span>
              <div className="exec-chart-bar-track">
                <div
                  className="exec-chart-bar-fill"
                  style={{ width: `${pct}%`, background: cfg.color || "var(--primary)" }}
                />
              </div>
              <span className="exec-chart-bar-val">{fmtUSD(row.teamUSD)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Renewal chart ─────────────────────────────────────────────────────────────
function RenewalChart({ rows }) {
  const sorted = [...rows].sort((a, b) => b.avgRate - a.avgRate);
  const max = Math.max(...sorted.map((r) => r.avgRate), 1);
  return (
    <div className="exec-chart-card">
      <div className="exec-chart-title">Renewal Rate by Team</div>
      <div className="exec-chart-sub">Average contract renewal (% increase)</div>
      <div className="exec-chart-body">
        {sorted.map((row) => {
          const pct = (row.avgRate / max) * 100;
          const color = rateColor(row.avgRate);
          return (
            <div key={row.team} className="exec-chart-row">
              <span className="exec-chart-label">{row.team}</span>
              <div className="exec-chart-bar-track">
                <div
                  className="exec-chart-bar-fill"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
              <span className="exec-chart-bar-val" style={{ color }}>
                {row.avgRate > 0 ? `+${row.avgRate}%` : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Risk matrix (scatter-like) ────────────────────────────────────────────────
function RiskMatrix({ rows }) {
  // X = portfolio %, Y = renewal rate, size = contract count
  const maxVal = Math.max(...rows.map((r) => r.teamUSD), 1);
  const maxRate = Math.max(...rows.map((r) => r.avgRate), 1);

  return (
    <div className="exec-chart-card exec-matrix-card">
      <div className="exec-chart-title">Portfolio vs Renewal Rate</div>
      <div className="exec-chart-sub">Bubble size = contract count · X = revenue share · Y = renewal rate</div>
      <div className="exec-matrix-body">
        {/* Grid lines */}
        <div className="exec-matrix-grid">
          {[0, 25, 50, 75, 100].map((p) => (
            <div key={p} className="exec-matrix-vline" style={{ left: `${p}%` }} />
          ))}
          {[0, 25, 50, 75, 100].map((p) => (
            <div key={p} className="exec-matrix-hline" style={{ bottom: `${p}%` }} />
          ))}
          {/* Quadrant labels */}
          <span className="exec-matrix-qlabel" style={{ bottom: "55%", right: "5%" }}>High Rate / Big Portfolio</span>
          <span className="exec-matrix-qlabel" style={{ bottom: "5%", right: "5%" }}>Low Rate / Big Portfolio</span>
          <span className="exec-matrix-qlabel" style={{ bottom: "55%", left: "5%" }}>High Rate / Small Portfolio</span>
          <span className="exec-matrix-qlabel" style={{ bottom: "5%", left: "5%" }}>At Risk</span>
        </div>
        {/* Bubbles */}
        {rows.map((row, i) => {
          const x = maxVal > 0 ? (row.teamUSD / maxVal) * 92 : 0;
          const y = maxRate > 0 ? (row.avgRate / maxRate) * 85 : 0;
          const size = 14 + Math.min(row.contractCount * 4, 32);
          const cfg = RANK_CFG[i] || { color: "var(--primary)", bg: "rgba(196,145,42,0.2)" };
          return (
            <div
              key={row.team}
              className="exec-bubble"
              style={{
                left: `${x}%`,
                bottom: `${y}%`,
                width: size,
                height: size,
                background: cfg.bg || "rgba(196,145,42,0.2)",
                borderColor: cfg.color || "var(--primary)",
                color: cfg.color || "var(--primary)",
              }}
              title={`${row.team}: ${fmtUSD(row.teamUSD)} · +${row.avgRate}% renewal`}
            >
              <span className="exec-bubble-label">{row.team.slice(0, 3)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Executive({ contracts, usdRate = 32, onNavigate }) {
  const { rows, totalUSD, companyAvgRate, activeContracts, atRiskTotal, uniqueCustomers } = useTeamMetrics(contracts, usdRate);
  const maxUSD = rows[0]?.teamUSD || 1;

  return (
    <div className="page exec-page">
      {/* Header */}
      <div className="details-header">
        <div>
          <div className="breadcrumb">Executive</div>
          <h2>Teams Overview</h2>
          <p className="muted">CEO view — team performance, portfolio health, and renewal rates at a glance.</p>
        </div>
        <div className="exec-header-meta">
          <span className="exec-header-date">
            {new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
          </span>
        </div>
      </div>

      {/* Company KPIs */}
      <div className="exec-kpi-strip">
        <KpiCard label="Total Portfolio" value={fmtUSD(totalUSD)} sub={`${contracts.length} contracts`} />
        <KpiCard label="Active Contracts" value={activeContracts} sub="Healthy & on-track" tone="success" />
        <KpiCard label="Unique Customers" value={uniqueCustomers} sub={`Across ${rows.length} teams`} />
        <KpiCard label="Avg Renewal Rate" value={companyAvgRate > 0 ? `+${companyAvgRate}%` : "—"} sub="Company-wide" tone="primary" />
        <KpiCard label="At Risk (30d)" value={atRiskTotal} sub="Needs attention" tone={atRiskTotal > 0 ? "danger" : undefined} />
      </div>

      {/* Team cards */}
      <div className="exec-section-title">Team Performance</div>
      <div className="exec-team-grid">
        {rows.map((row, i) => (
          <TeamCard key={row.team} row={row} rank={i} maxUSD={maxUSD} onNavigate={onNavigate} />
        ))}
      </div>

      {/* Charts row */}
      <div className="exec-charts-row">
        <RevenueChart rows={rows} />
        <RenewalChart rows={rows} />
      </div>

      {/* Risk matrix */}
      <RiskMatrix rows={rows} />
    </div>
  );
}
