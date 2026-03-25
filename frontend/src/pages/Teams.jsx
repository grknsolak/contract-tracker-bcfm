import React, { useMemo, useState } from "react";
import { daysUntil, formatDate } from "../utils/date";
import { getRenewalRates } from "../utils/pricing";
import { normalizeStage } from "../utils/status";

// ── helpers ──────────────────────────────────────────────────────────────────
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

function fmtLocal(value, currency) {
  if (!value) return "—";
  const sym = currency === "USD" ? "$" : "₺";
  if (value >= 1_000_000) return `${sym}${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `${sym}${(value / 1_000).toFixed(0)}K`;
  return `${sym}${Math.round(value)}`;
}

const PIPELINE_STAGES = new Set(["Draft", "Legal Review", "Signature", "Renewal Protocol"]);

const STAGE_COLORS = {
  "Active":           { color: "#10b981", bg: "rgba(16,185,129,.12)" },
  "Signed":           { color: "#3b82f6", bg: "rgba(59,130,246,.12)" },
  "Renewal Upcoming": { color: "#f59e0b", bg: "rgba(245,158,11,.12)" },
  "Renewal Protocol": { color: "#a78bfa", bg: "rgba(167,139,250,.12)" },
  "Draft":            { color: "#94a3b8", bg: "rgba(148,163,184,.12)" },
  "Legal Review":     { color: "#06b6d4", bg: "rgba(6,182,212,.12)" },
  "Signature":        { color: "#8b5cf6", bg: "rgba(139,92,246,.12)" },
  "Approval Pending": { color: "#f97316", bg: "rgba(249,115,22,.12)" },
  "Under Review":     { color: "#64748b", bg: "rgba(100,116,139,.12)" },
  "Expired":          { color: "#ef4444", bg: "rgba(239,68,68,.12)" },
};

// ── Team metrics per team ─────────────────────────────────────────────────────
function useTeamData(contracts, usdRate) {
  return useMemo(() => {
    const totalUSD = contracts.reduce((s, c) => s + toUSD(c.value, c.currency, usdRate), 0);
    const grouped = {};
    contracts.forEach((c) => {
      const team = c.team || "Unassigned";
      if (!grouped[team]) grouped[team] = [];
      grouped[team].push(c);
    });

    return Object.entries(grouped)
      .map(([team, tc]) => {
        const teamUSD = tc.reduce((s, c) => s + toUSD(c.value, c.currency, usdRate), 0);
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
        const atRisk = tc.filter((c) => { const d = daysUntil(c.endDate); return typeof d === "number" && d >= 0 && d <= 30; }).length;
        const inPipeline = tc.filter((c) => PIPELINE_STAGES.has(normalizeStage(c.stage))).length;
        const expired = tc.filter((c) => { const d = daysUntil(c.endDate); return typeof d === "number" && d < 0; }).length;
        const pct = totalUSD > 0 ? (teamUSD / totalUSD) * 100 : 0;

        return { team, teamUSD, pct, customerCount: customers.size, contractCount: tc.length, avgRate, atRisk, inPipeline, expired, contracts: tc };
      })
      .sort((a, b) => b.teamUSD - a.teamUSD);
  }, [contracts, usdRate]);
}

// ── Stage badge ───────────────────────────────────────────────────────────────
function StageBadge({ stage }) {
  const s = normalizeStage(stage);
  const cfg = STAGE_COLORS[s] || STAGE_COLORS["Active"];
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.02em",
      color: cfg.color,
      background: cfg.bg,
      border: `1px solid ${cfg.color}33`,
      whiteSpace: "nowrap",
    }}>
      {s}
    </span>
  );
}

// ── Days pill ─────────────────────────────────────────────────────────────────
function DaysPill({ endDate }) {
  const d = daysUntil(endDate);
  if (typeof d !== "number") return <span style={{ color: "var(--text-muted)" }}>—</span>;
  if (d < 0)  return <span style={{ color: "#ef4444", fontWeight: 600, fontSize: 12 }}>Expired</span>;
  if (d <= 14) return <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 12 }}>{d}d</span>;
  if (d <= 30) return <span style={{ color: "#f59e0b", fontWeight: 600, fontSize: 12 }}>{d}d</span>;
  if (d <= 90) return <span style={{ color: "#f59e0b", fontSize: 12 }}>{d}d</span>;
  return <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{d}d</span>;
}

// ── Value delta ───────────────────────────────────────────────────────────────
function ValueDelta({ contract, usdRate }) {
  const hist = contract.valueHistory;
  if (!hist || hist.length < 2) return null;
  const prev = toUSD(hist[hist.length - 2]?.value, contract.currency, usdRate);
  const curr = toUSD(hist[hist.length - 1]?.value, contract.currency, usdRate);
  if (!prev || !curr) return null;
  const pct = ((curr - prev) / prev) * 100;
  if (Math.abs(pct) < 0.5) return null;
  const up = pct > 0;
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 600,
      color: up ? "#10b981" : "#ef4444",
      background: up ? "rgba(16,185,129,.1)" : "rgba(239,68,68,.1)",
      borderRadius: 4,
      padding: "1px 5px",
      marginLeft: 4,
      letterSpacing: "0.02em",
    }}>
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

// ── Stage distribution mini-bar ───────────────────────────────────────────────
function StageDistribution({ contracts }) {
  const counts = {};
  contracts.forEach((c) => {
    const s = normalizeStage(c.stage);
    counts[s] = (counts[s] || 0) + 1;
  });
  const total = contracts.length;
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {entries.map(([stage, count]) => {
        const cfg = STAGE_COLORS[stage] || STAGE_COLORS["Active"];
        const pct = (count / total) * 100;
        return (
          <div key={stage} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", width: 110, flexShrink: 0 }}>{stage}</span>
            <div style={{ flex: 1, height: 6, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: cfg.color, borderRadius: 999, transition: "width .3s" }} />
            </div>
            <span style={{ fontSize: 11, color: "var(--text-secondary)", width: 20, textAlign: "right" }}>{count}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Expiry timeline ──────────────────────────────────────────────────────────
function ExpiryTimeline({ contracts, usdRate, onNavigate }) {
  const upcoming = contracts
    .map((c) => ({ ...c, days: daysUntil(c.endDate) }))
    .filter((c) => typeof c.days === "number" && c.days >= 0 && c.days <= 90)
    .sort((a, b) => a.days - b.days);

  if (!upcoming.length) return (
    <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "16px 0" }}>
      Next 90 days: no expiring contracts
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {upcoming.map((c) => {
        const usd = toUSD(c.value, c.currency, usdRate);
        const urgent = c.days <= 14;
        const warn = c.days <= 30;
        return (
          <div
            key={c.id}
            onClick={() => onNavigate(`/contracts/${c.id}`)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 10px",
              borderRadius: 8,
              border: `1px solid ${urgent ? "rgba(239,68,68,.25)" : warn ? "rgba(245,158,11,.2)" : "var(--border)"}`,
              background: urgent ? "rgba(239,68,68,.05)" : warn ? "rgba(245,158,11,.04)" : "var(--surface-raised)",
              cursor: "pointer",
              transition: "opacity .15s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: urgent ? "rgba(239,68,68,.15)" : warn ? "rgba(245,158,11,.12)" : "var(--hover-bg)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: urgent ? "#ef4444" : warn ? "#f59e0b" : "var(--text-muted)",
              flexShrink: 0,
            }}>
              {c.days}d
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.customerName}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.contractName || c.contractType}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{fmtUSD(usd)}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{formatDate(c.endDate)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Contract table ────────────────────────────────────────────────────────────
function ContractTable({ contracts, usdRate, onNavigate }) {
  const [sort, setSort] = useState({ key: "days", dir: 1 });

  const sorted = useMemo(() => {
    return [...contracts].sort((a, b) => {
      const dA = daysUntil(a.endDate) ?? 9999;
      const dB = daysUntil(b.endDate) ?? 9999;
      if (sort.key === "days")  return sort.dir * (dA - dB);
      if (sort.key === "value") return sort.dir * (toUSD(b.value, b.currency, usdRate) - toUSD(a.value, a.currency, usdRate));
      if (sort.key === "name")  return sort.dir * a.customerName.localeCompare(b.customerName);
      return 0;
    });
  }, [contracts, sort, usdRate]);

  const toggle = (key) => setSort((s) => ({ key, dir: s.key === key ? -s.dir : 1 }));
  const SortIcon = ({ k }) => {
    if (sort.key !== k) return <span style={{ opacity: .3, marginLeft: 3, fontSize: 9 }}>↕</span>;
    return <span style={{ marginLeft: 3, fontSize: 9, color: "var(--primary-light)" }}>{sort.dir === 1 ? "↑" : "↓"}</span>;
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {[
              { key: "name",  label: "Customer" },
              { key: null,    label: "Contract" },
              { key: "value", label: "Value" },
              { key: null,    label: "Stage" },
              { key: null,    label: "Start" },
              { key: null,    label: "End" },
              { key: "days",  label: "Remaining" },
            ].map(({ key, label }) => (
              <th
                key={label}
                onClick={key ? () => toggle(key) : undefined}
                style={{
                  textAlign: "left", padding: "8px 10px", fontSize: 10, fontWeight: 700,
                  letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-muted)",
                  cursor: key ? "pointer" : "default", userSelect: "none", whiteSpace: "nowrap",
                }}
              >
                {label}{key && <SortIcon k={key} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((c, i) => {
            const usd = toUSD(c.value, c.currency, usdRate);
            const days = daysUntil(c.endDate);
            const rowExpired = typeof days === "number" && days < 0;
            return (
              <tr
                key={c.id}
                onClick={() => onNavigate(`/contracts/${c.id}`)}
                style={{
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                  background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,.015)",
                  opacity: rowExpired ? 0.6 : 1,
                  transition: "background .12s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--hover-bg)"}
                onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,.015)"}
              >
                <td style={{ padding: "10px 10px" }}>
                  <div style={{ fontWeight: 600, color: "var(--text)" }}>{c.customerName}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.owner}</div>
                </td>
                <td style={{ padding: "10px 10px", color: "var(--text-secondary)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.contractName || c.contractType || "—"}
                </td>
                <td style={{ padding: "10px 10px", fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap" }}>
                  {fmtLocal(c.value, c.currency)}
                  <ValueDelta contract={c} usdRate={usdRate} />
                  {c.currency !== "USD" && (
                    <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 400 }}>{fmtUSD(usd)}</div>
                  )}
                </td>
                <td style={{ padding: "10px 10px" }}>
                  <StageBadge stage={c.stage} />
                </td>
                <td style={{ padding: "10px 10px", color: "var(--text-muted)", fontSize: 12 }}>
                  {formatDate(c.startDate) || "—"}
                </td>
                <td style={{ padding: "10px 10px", color: "var(--text-muted)", fontSize: 12 }}>
                  {formatDate(c.endDate) || "—"}
                </td>
                <td style={{ padding: "10px 10px" }}>
                  <DaysPill endDate={c.endDate} />
                </td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={7} style={{ padding: "32px 10px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                Bu takımda henüz sözleşme yok
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: "var(--surface-raised)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "16px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 4,
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-muted)" }}>
        {label}
      </span>
      <span style={{ fontSize: 22, fontWeight: 700, color: accent || "var(--text)", letterSpacing: "-0.01em" }}>
        {value}
      </span>
      {sub && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{sub}</span>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Teams({ contracts = [], usdRate = 32, onNavigate }) {
  const teamData = useTeamData(contracts, usdRate);
  const [activeTeam, setActiveTeam] = useState(null);

  const selected = useMemo(() => {
    if (!teamData.length) return null;
    const name = activeTeam || teamData[0]?.team;
    return teamData.find((t) => t.team === name) || teamData[0];
  }, [teamData, activeTeam]);

  if (!teamData.length) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
        Henüz sözleşme yok.
      </div>
    );
  }

  return (
    <div style={{ padding: "0 0 40px" }}>
      {/* Header */}
      <div style={{ padding: "28px 28px 0" }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text)" }}>Teams</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
          Takım bazlı sözleşme detayları ve değişiklikler
        </p>
      </div>

      {/* Team tabs */}
      <div style={{
        display: "flex",
        gap: 6,
        padding: "20px 28px 0",
        overflowX: "auto",
        scrollbarWidth: "none",
        flexWrap: "wrap",
      }}>
        {teamData.map((t) => {
          const isActive = selected?.team === t.team;
          return (
            <button
              key={t.team}
              onClick={() => setActiveTeam(t.team)}
              style={{
                padding: "7px 16px",
                borderRadius: 999,
                border: `1px solid ${isActive ? "var(--primary)" : "var(--border)"}`,
                background: isActive ? "var(--primary)" : "transparent",
                color: isActive ? "#fff" : "var(--text-secondary)",
                fontWeight: isActive ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
                transition: "all .15s",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {t.team}
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                background: isActive ? "rgba(255,255,255,.2)" : "var(--hover-bg)",
                borderRadius: 999,
                padding: "1px 6px",
                color: isActive ? "#fff" : "var(--text-muted)",
              }}>
                {t.contractCount}
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div style={{ padding: "24px 28px 0" }}>
          {/* KPI row */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}>
            <KpiCard
              label="Portfolio Value"
              value={fmtUSD(selected.teamUSD)}
              sub={`${selected.pct.toFixed(1)}% of total`}
            />
            <KpiCard
              label="Customers"
              value={selected.customerCount}
              sub={`${selected.contractCount} contracts`}
            />
            <KpiCard
              label="Avg Renewal"
              value={selected.avgRate ? `${selected.avgRate}%` : "—"}
              sub="weighted avg"
              accent={selected.avgRate >= 80 ? "#10b981" : selected.avgRate >= 60 ? "#f59e0b" : "#ef4444"}
            />
            <KpiCard
              label="At Risk"
              value={selected.atRisk}
              sub="expiring ≤30 days"
              accent={selected.atRisk > 0 ? "#f59e0b" : undefined}
            />
            <KpiCard
              label="In Pipeline"
              value={selected.inPipeline}
              sub="draft / review / sign"
              accent={selected.inPipeline > 0 ? "#3b82f6" : undefined}
            />
            <KpiCard
              label="Expired"
              value={selected.expired}
              sub="churned / overdue"
              accent={selected.expired > 0 ? "#ef4444" : undefined}
            />
          </div>

          {/* Main layout: table + right panel */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20, alignItems: "start" }}>
            {/* Contract table */}
            <div style={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              overflow: "hidden",
            }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>
                  Sözleşmeler
                </span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {selected.contractCount} contract{selected.contractCount !== 1 ? "s" : ""}
                </span>
              </div>
              <ContractTable
                contracts={selected.contracts}
                usdRate={usdRate}
                onNavigate={onNavigate}
              />
            </div>

            {/* Right panel */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Stage distribution */}
              <div style={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 16,
              }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)", marginBottom: 14 }}>
                  Stage Dağılımı
                </div>
                <StageDistribution contracts={selected.contracts} />
              </div>

              {/* Expiry timeline */}
              <div style={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 16,
              }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)", marginBottom: 14 }}>
                  Yaklaşan Bitişler
                  <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 400, marginLeft: 6 }}>90 gün içinde</span>
                </div>
                <ExpiryTimeline
                  contracts={selected.contracts}
                  usdRate={usdRate}
                  onNavigate={onNavigate}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
