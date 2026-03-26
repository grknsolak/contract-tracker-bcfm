import React, { useMemo, useState } from "react";
import Badge from "../components/Badge";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import { daysUntil, formatCurrency, formatDate } from "../utils/date";
import { getPortfolioOperationalMetrics } from "../utils/contractMetrics";
import { getRenewalRates } from "../utils/pricing";
import { getCustomerTier } from "../utils/customerTier";
import { normalizeStage, renewalTone } from "../utils/status";

// ── Helpers ───────────────────────────────────────────────────────────────────
const quarterLabels = ["Q1", "Q2", "Q3", "Q4"];

function getQuarter(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor(date.getMonth() / 3);
}

function getQuarterSummary(contracts) {
  const buckets = quarterLabels.map((label, index) => ({ label, index, contracts: [] }));
  contracts.forEach((contract) => {
    const qi = getQuarter(contract.endDate);
    if (qi == null) return;
    buckets[qi].contracts.push(contract);
  });
  return buckets.map((b) => ({
    ...b,
    contracts: b.contracts.sort((a, b) => new Date(a.endDate) - new Date(b.endDate)),
  }));
}

function getUniqueCustomerContracts(contracts) {
  const byCustomer = new Map();
  contracts.forEach((contract) => {
    const key = contract.customerName;
    const current = byCustomer.get(key);
    if (!current || new Date(contract.endDate) > new Date(current.endDate)) {
      byCustomer.set(key, contract);
    }
  });
  return Array.from(byCustomer.values()).sort((a, b) => a.customerName.localeCompare(b.customerName));
}

function toUSD(value, currency, usdRate) {
  if (!value) return 0;
  if (currency === "TL" || currency === "TRY") return value / usdRate;
  return Number(value) || 0;
}

function fmtUSD(value) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `$${(value / 1_000).toFixed(0)}K`;
  return `$${Math.round(value)}`;
}

function rateColor(r) {
  if (r >= 25) return "var(--success)";
  if (r >= 12) return "var(--primary)";
  if (r > 0)   return "var(--warning)";
  return "var(--muted)";
}

const TIER_CFG = {
  "A+": { color: "#C4912A", bg: "rgba(196,145,42,0.14)" },
  "A":  { color: "#8E9BAD", bg: "rgba(142,155,173,0.14)" },
  "B":  { color: "#6EE7B7", bg: "rgba(110,231,183,0.12)" },
  "C":  { color: "#93C5FD", bg: "rgba(147,197,253,0.12)" },
};

const RANK_CFG = [
  { bg: "rgba(196,145,42,0.18)", color: "#DBA84A", border: "rgba(196,145,42,0.35)" },
  { bg: "rgba(148,163,184,0.15)", color: "#94A3B8", border: "rgba(148,163,184,0.3)" },
  { bg: "rgba(180,130,90,0.15)",  color: "#C8956A", border: "rgba(180,130,90,0.3)"  },
];

const PIPELINE_STAGES = new Set(["Draft", "Legal Review", "Signature", "Renewal Protocol"]);

// ── Team metrics ──────────────────────────────────────────────────────────────
function useTeamMetrics(contracts, usdRate) {
  return useMemo(() => {
    const totalUSD = contracts.reduce((s, c) => s + toUSD(c.value, c.currency, usdRate), 0);
    const customerUSD = {};
    contracts.forEach((c) => {
      customerUSD[c.customerName] = (customerUSD[c.customerName] || 0) + toUSD(c.value, c.currency, usdRate);
    });

    const grouped = {};
    contracts.forEach((c) => {
      const team = c.team || "Unassigned";
      if (!grouped[team]) grouped[team] = [];
      grouped[team].push(c);
    });

    return Object.entries(grouped)
      .map(([team, tc]) => {
        const teamUSD  = tc.reduce((s, c) => s + toUSD(c.value, c.currency, usdRate), 0);
        const pct      = totalUSD > 0 ? (teamUSD / totalUSD) * 100 : 0;
        const customers = new Set(tc.map((c) => c.customerName));

        const rates = [];
        tc.forEach((c) => {
          const r = getRenewalRates(c);
          (c.scopes || []).forEach((s) => {
            const v = Number(r[s] || 0);
            if (v > 0) rates.push(v);
          });
        });
        const avgRate = rates.length ? Math.round(rates.reduce((s, r) => s + r, 0) / rates.length) : 0;

        const atRisk = tc.filter((c) => {
          const d = daysUntil(c.endDate);
          return typeof d === "number" && d >= 0 && d <= 30;
        }).length;

        const inPipeline = tc.filter((c) => PIPELINE_STAGES.has(normalizeStage(c.stage))).length;

        const churnedCustomers = new Set(
          tc.filter((c) => daysUntil(c.endDate) < 0 || c.renewalStatus === "Lost")
             .map((c) => c.customerName)
        ).size;

        const custTeamUSD = {};
        tc.forEach((c) => {
          custTeamUSD[c.customerName] = (custTeamUSD[c.customerName] || 0) + toUSD(c.value, c.currency, usdRate);
        });
        const [topName, topVal] = Object.entries(custTeamUSD).sort((a, b) => b[1] - a[1])[0] || ["—", 0];

        const tierCounts = { "A+": 0, "A": 0, "B": 0, "C": 0 };
        [...customers].forEach((name) => {
          const t = getCustomerTier(customerUSD[name] || 0, totalUSD);
          if (t?.label) tierCounts[t.label] = (tierCounts[t.label] || 0) + 1;
        });

        const years = [...new Set(tc.map((c) => c.startDate?.slice(0, 4)).filter(Boolean))].sort();
        let trend = null;
        if (years.length >= 2) {
          const thisY = tc.filter((c) => c.startDate?.startsWith(years[years.length - 1])).reduce((s, c) => s + toUSD(c.value, c.currency, usdRate), 0);
          const prevY = tc.filter((c) => c.startDate?.startsWith(years[years.length - 2])).reduce((s, c) => s + toUSD(c.value, c.currency, usdRate), 0);
          if (prevY > 0) trend = ((thisY - prevY) / prevY) * 100;
        }

        return { team, teamUSD, pct, customerCount: customers.size, contractCount: tc.length, avgRate, atRisk, inPipeline, churnedCustomers, topName, topVal, tierCounts, trend };
      })
      .sort((a, b) => b.teamUSD - a.teamUSD);
  }, [contracts, usdRate]);
}

// ── Sub-components ────────────────────────────────────────────────────────────
function PortfolioShare({ pct, color = "var(--primary)" }) {
  const r = 18, cx = 22, cy = 22;
  const circ = 2 * Math.PI * r;
  const fill = (pct / 100) * circ;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width="44" height="44" viewBox="0 0 44 44" style={{ flexShrink: 0 }}>
        {/* track */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke="rgba(255,255,255,0.07)" strokeWidth="5"/>
        {/* fill — starts at top (-90°) */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${fill} ${circ}`}
          strokeDashoffset={circ / 4}
          style={{ transition: "stroke-dasharray .5s ease, stroke .3s" }}/>
        {/* center label */}
        <text x={cx} y={cy + 4} textAnchor="middle"
          fontSize="8" fontWeight="800" fill="white" letterSpacing="-0.02em">
          {pct.toFixed(0)}%
        </text>
      </svg>
      <div style={{ lineHeight: 1.3 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>
          {pct.toFixed(1)}%
        </div>
        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>of portfolio</div>
      </div>
    </div>
  );
}

function TrendChip({ trend }) {
  if (trend === null) return null;
  const up = trend >= 0;
  return (
    <span
      className={`exec-trend${up ? " exec-trend--up" : " exec-trend--down"}`}
      title="Yıllık sözleşme değeri büyümesi (YoY) — en son yıl vs bir önceki yıl"
    >
      {up
        ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
        : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      }
      {Math.abs(trend).toFixed(0)}% <span style={{ fontSize: "9px", opacity: 0.7, fontWeight: 600, letterSpacing: "0.04em" }}>YoY</span>
    </span>
  );
}

function TeamCard({ row, rank, maxUSD, onNavigate }) {
  const cfg = RANK_CFG[rank] || null;
  return (
    <div className="exec-team-card">
      <div className="exec-team-header">
        <div className="exec-team-name-row">
          {cfg && <span className="exec-rank-badge" style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>#{rank + 1}</span>}
          <span className="exec-team-name">{row.team}</span>
        </div>
        <span className="exec-team-value">{fmtUSD(row.teamUSD)}</span>
      </div>

      <div className="exec-pct-row">
        <PortfolioShare pct={row.pct} color={cfg?.color || "var(--primary)"} />
      </div>

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

      <div className="exec-tiers">
        {Object.entries(TIER_CFG)
          .filter(([label]) => (row.tierCounts[label] || 0) > 0)
          .map(([label, c]) => (
            <div key={label} style={{
              display: "inline-flex",
              alignItems: "stretch",
              borderRadius: 7,
              border: `1px solid ${c.color}40`,
              overflow: "hidden",
              fontSize: 11,
              flexShrink: 0,
            }}>
              {/* Tier letter — colored left side */}
              <span style={{
                padding: "4px 8px",
                background: `${c.color}28`,
                color: c.color,
                fontWeight: 800,
                letterSpacing: "0.03em",
              }}>
                {label}
              </span>
              {/* Count — neutral right side */}
              <span style={{
                padding: "4px 9px",
                background: "rgba(255,255,255,0.03)",
                color: "var(--text)",
                fontWeight: 700,
                borderLeft: `1px solid ${c.color}25`,
              }}>
                {row.tierCounts[label]}
              </span>
            </div>
          ))}
      </div>

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

    </div>
  );
}

function RevenueChart({ rows }) {
  const max = Math.max(...rows.map((r) => r.teamUSD), 1);
  return (
    <div className="exec-chart-card">
      <div className="exec-chart-title">Revenue by Team</div>
      <div className="exec-chart-sub">Total contract value in USD</div>
      <div className="exec-chart-body">
        {rows.map((row, i) => {
          const color = RANK_CFG[i]?.color || "var(--primary)";
          return (
            <div key={row.team} className="exec-chart-row">
              <span className="exec-chart-label">{row.team}</span>
              <div className="exec-chart-bar-track">
                <div className="exec-chart-bar-fill" style={{ width: `${(row.teamUSD / max) * 100}%`, background: color }} />
              </div>
              <span className="exec-chart-bar-val">{fmtUSD(row.teamUSD)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RenewalChart({ rows }) {
  const sorted = [...rows].sort((a, b) => b.avgRate - a.avgRate);
  const max = Math.max(...sorted.map((r) => r.avgRate), 1);
  return (
    <div className="exec-chart-card">
      <div className="exec-chart-title">Renewal Rate by Team</div>
      <div className="exec-chart-sub">Average contract renewal (% increase)</div>
      <div className="exec-chart-body">
        {sorted.map((row) => {
          const color = rateColor(row.avgRate);
          return (
            <div key={row.team} className="exec-chart-row">
              <span className="exec-chart-label">{row.team}</span>
              <div className="exec-chart-bar-track">
                <div className="exec-chart-bar-fill" style={{ width: `${(row.avgRate / max) * 100}%`, background: color }} />
              </div>
              <span className="exec-chart-bar-val" style={{ color }}>{row.avgRate > 0 ? `+${row.avgRate}%` : "—"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard({ contracts, onNavigate, usdRate = 32 }) {
  const [selectedMetric, setSelectedMetric] = useState(null);

  const totalCustomers   = useMemo(() => new Set(contracts.map((c) => c.customerName)).size, [contracts]);
  const operationalMetrics = useMemo(() => getPortfolioOperationalMetrics(contracts), [contracts]);
  const customerContracts  = useMemo(() => getUniqueCustomerContracts(contracts), [contracts]);

  const metrics = useMemo(() => {
    const activeCustomers = new Set(
      contracts.filter((c) => normalizeStage(c.stage) !== "Expired" && c.renewalStatus !== "Lost").map((c) => c.customerName)
    ).size;
    const next30 = contracts.filter((c) => {
      const d = daysUntil(c.endDate);
      return typeof d === "number" && d >= 0 && d <= 30;
    }).length;
    const churned = new Set(
      contracts.filter((c) => daysUntil(c.endDate) < 0 || c.renewalStatus === "Lost").map((c) => c.customerName)
    ).size;
    return { activeCustomers, next30, churned };
  }, [contracts]);

  const quarterSummary = useMemo(() => getQuarterSummary(contracts), [contracts]);
  const teamRows       = useTeamMetrics(contracts, usdRate);
  const maxTeamUSD     = teamRows[0]?.teamUSD || 1;

  const metricCustomerMap = useMemo(() => {
    const active = getUniqueCustomerContracts(
      contracts.filter((c) => normalizeStage(c.stage) !== "Expired" && c.renewalStatus !== "Lost")
    );
    const renewals30 = getUniqueCustomerContracts(
      contracts.filter((c) => { const d = daysUntil(c.endDate); return typeof d === "number" && d >= 0 && d <= 30; })
    );
    const currentYear = new Date().getFullYear();
    const churn = getUniqueCustomerContracts(
      contracts.filter((c) => {
        const endYear = c.endDate ? new Date(c.endDate).getFullYear() : null;
        return (daysUntil(c.endDate) < 0 || c.renewalStatus === "Lost") && endYear === currentYear;
      })
    );
    return {
      customers:  { title: "All customers",          description: "Open a customer to jump straight to its contract detail.", items: customerContracts },
      active:     { title: "Active customers",        description: "Customers with healthy active contracts.",                 items: active },
      renewals30: { title: "Renewals in 30 days",     description: "Customers needing immediate renewal follow-up.",          items: renewals30 },
      churn:      { title: "Churned customers",       description: "Customers that are overdue or marked as lost.",           items: churn },
    };
  }, [contracts, customerContracts]);

  const headlineCards = [
    { id: "customers",  label: "Customers",       value: totalCustomers,           meta: `${contracts.length} total contracts` },
    { id: "active",     label: "Active",           value: metrics.activeCustomers,  meta: "Healthy customer base" },
    { id: "renewals30", label: "Renewals in 30d",  value: metrics.next30,           meta: "Immediate follow-up" },
    { id: "churn",      label: "Churn",            value: metrics.churned,          meta: `${new Date().getFullYear()} lost`, tone: "danger" },
  ];

  return (
    <div className="page dashboard-simple">
      {/* Hero */}
      <div className="dashboard-hero">
        <div>
          <h2 className="dashboard-title">Portfolio overview</h2>
          <p className="dashboard-copy">A cleaner view of customer health, upcoming renewals, and where attention is needed now.</p>
        </div>
        <div className="dashboard-kpis-inline">
          <div className="dashboard-kpi-inline">
            <span className="dashboard-kpi-label">Avg renewal</span>
            <strong>{operationalMetrics.averageRenewalDays != null ? `${operationalMetrics.averageRenewalDays}d` : "-"}</strong>
          </div>
          <div className="dashboard-kpi-inline">
            <span className="dashboard-kpi-label">Cycle time</span>
            <strong>{operationalMetrics.averageSalesCycleDays != null ? `${operationalMetrics.averageSalesCycleDays}d` : "-"}</strong>
          </div>
          <div className="dashboard-kpi-inline">
            <span className="dashboard-kpi-label">Delayed actions</span>
            <strong className={operationalMetrics.overdueActionsCount ? "text-danger" : ""}>{operationalMetrics.overdueActionsCount}</strong>
          </div>
        </div>
      </div>

      {/* Headline KPIs */}
      <div className="dashboard-headline-grid">
        {headlineCards.map((item) => (
          <Card key={item.label} className="dashboard-headline-card dashboard-headline-card-clickable">
            <button className="dashboard-headline-button" onClick={() => setSelectedMetric(item.id)}>
              <div className="dashboard-headline-label">{item.label}</div>
              <div className={`dashboard-headline-value ${item.tone || ""}`.trim()}>{item.value}</div>
              <div className="dashboard-headline-meta">{item.meta}</div>
            </button>
          </Card>
        ))}
      </div>

      {/* Team Performance */}
      <div className="exec-section-title">Team Performance</div>
      <div className="exec-team-grid">
        {teamRows.map((row, i) => (
          <TeamCard key={row.team} row={row} rank={i} maxUSD={maxTeamUSD} onNavigate={onNavigate} />
        ))}
      </div>

      {/* Charts */}
      <div className="exec-charts-row">
        <RevenueChart rows={teamRows} />
        <RenewalChart rows={teamRows} />
      </div>

      {/* Quarter view */}
      <Card title="Quarter view" subtitle="Contracts grouped by end quarter">
        <div className="dashboard-quarter-grid">
          {quarterSummary.map((quarter) => (
            <div key={quarter.label} className="dashboard-quarter-card">
              <div className="dashboard-quarter-head">
                <strong>{quarter.label}</strong>
                <span className="muted">{quarter.contracts.length} contracts</span>
              </div>
              {quarter.contracts.length === 0 ? (
                <div className="muted">No contracts</div>
              ) : (
                <div className="dashboard-quarter-list">
                  {quarter.contracts.slice(0, 4).map((contract) => (
                    <button
                      key={contract.id}
                      className="dashboard-quarter-item"
                      onClick={() => onNavigate(`/contracts/${contract.id}`)}
                    >
                      <span className="primary-text">{contract.customerName}</span>
                      <span className="muted">{formatDate(contract.endDate)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Metric modal */}
      {selectedMetric ? (
        <Modal
          title={metricCustomerMap[selectedMetric]?.title || "Customers"}
          description={metricCustomerMap[selectedMetric]?.description}
          onClose={() => setSelectedMetric(null)}
        >
          {metricCustomerMap[selectedMetric]?.items?.length ? (
            <div className="dashboard-metric-list">
              {metricCustomerMap[selectedMetric].items.map((contract) => (
                <button
                  key={contract.id}
                  className="dashboard-metric-item"
                  onClick={() => { setSelectedMetric(null); onNavigate(`/contracts/${contract.id}`); }}
                >
                  <div>
                    <div className="primary-text">{contract.customerName}</div>
                    <div className="muted">{contract.contractName} · {formatCurrency(contract.value, contract.currency)}</div>
                  </div>
                  <div className="dashboard-metric-side">
                    <span className="muted">{formatDate(contract.endDate)}</span>
                    <Badge tone={renewalTone[contract.renewalStatus] || "neutral"}>{contract.renewalStatus}</Badge>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState title="No customers" description="There are no customers in this group right now." />
          )}
        </Modal>
      ) : null}
    </div>
  );
}
