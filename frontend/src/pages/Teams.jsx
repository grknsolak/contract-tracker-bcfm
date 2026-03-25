import React, { useMemo, useState } from "react";
import { daysUntil } from "../utils/date";
import { getRenewalRates } from "../utils/pricing";
import { normalizeStage } from "../utils/status";

// ─── helpers ──────────────────────────────────────────────────────────────────
function toUSD(value, currency, usdRate) {
  if (!value) return 0;
  if (currency === "TL" || currency === "TRY") return value / usdRate;
  return Number(value) || 0;
}

function fmtUSD(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

const PIPELINE_STAGES = new Set(["Draft", "Legal Review", "Signature", "Renewal Protocol"]);

const STAGE_DOT = {
  "Active":           "#10b981",
  "Signed":           "#3b82f6",
  "Renewal Upcoming": "#f59e0b",
  "Renewal Protocol": "#a78bfa",
  "Draft":            "#94a3b8",
  "Legal Review":     "#06b6d4",
  "Signature":        "#8b5cf6",
  "Approval Pending": "#f97316",
  "Under Review":     "#64748b",
  "Expired":          "#ef4444",
};

const SCOPE_PALETTE = [
  "#3b82f6","#10b981","#a78bfa","#f59e0b","#ec4899",
  "#06b6d4","#f97316","#8b5cf6","#64748b","#ef4444",
];

// ─── data ─────────────────────────────────────────────────────────────────────
function useTeamData(contracts, usdRate) {
  return useMemo(() => {
    const totalUSD = contracts.reduce((s, c) => s + toUSD(c.value, c.currency, usdRate), 0);
    const grouped = {};
    contracts.forEach((c) => {
      const team = c.team || "Unassigned";
      if (!grouped[team]) grouped[team] = [];
      grouped[team].push(c);
    });

    return Object.entries(grouped).map(([team, tc]) => {
      const teamUSD = tc.reduce((s, c) => s + toUSD(c.value, c.currency, usdRate), 0);
      const customers = [...new Set(tc.map((c) => c.customerName))];

      const rates = [];
      tc.forEach((c) => {
        const r = getRenewalRates(c);
        (c.scopes || []).forEach((s) => {
          const v = Number(r[s] || 0);
          if (v > 0) rates.push(v);
        });
      });
      const avgRate = rates.length
        ? Math.round(rates.reduce((s, r) => s + r, 0) / rates.length)
        : 0;

      const atRisk  = tc.filter((c) => { const d = daysUntil(c.endDate); return typeof d === "number" && d >= 0 && d <= 30; }).length;
      const inPipeline = tc.filter((c) => PIPELINE_STAGES.has(normalizeStage(c.stage))).length;
      const expired = tc.filter((c) => { const d = daysUntil(c.endDate); return typeof d === "number" && d < 0; }).length;
      const active  = tc.filter((c) => { const d = daysUntil(c.endDate); return typeof d === "number" && d >= 0; }).length;
      const pct = totalUSD > 0 ? (teamUSD / totalUSD) * 100 : 0;

      const riskScore   = tc.length > 0 ? Math.round((1 - atRisk / tc.length) * 100) : 100;
      const healthScore = rates.length > 0 ? Math.round(avgRate * 0.6 + riskScore * 0.4) : riskScore;

      // scope breakdown by portfolio value
      const scopeMap = {};
      tc.forEach((c) => {
        const usd = toUSD(c.value, c.currency, usdRate);
        (c.scopes || []).forEach((scope) => {
          if (!scopeMap[scope]) scopeMap[scope] = { count: 0, value: 0 };
          scopeMap[scope].count++;
          scopeMap[scope].value += usd;
        });
      });
      const scopes = Object.entries(scopeMap)
        .sort((a, b) => b[1].value - a[1].value)
        .map(([name, d], i) => ({ name, color: SCOPE_PALETTE[i % SCOPE_PALETTE.length], ...d }));

      // stage distribution
      const stageCounts = {};
      tc.forEach((c) => {
        const s = normalizeStage(c.stage);
        stageCounts[s] = (stageCounts[s] || 0) + 1;
      });

      return {
        team, teamUSD, pct, customers, contractCount: tc.length,
        avgRate, atRisk, inPipeline, expired, active,
        healthScore, scopes, stageCounts, contracts: tc,
      };
    }).sort((a, b) => b.teamUSD - a.teamUSD);
  }, [contracts, usdRate]);
}

// ─── Gauge (speedometer) ──────────────────────────────────────────────────────
// Arc: cx=60 cy=58 r=42 → left=(18,58) top=(60,16) right=(102,58)
// sweep-flag=0 → counterclockwise = visually upward
function Gauge({ value = 0 }) {
  const pct   = Math.min(1, Math.max(0, value / 100));
  const r = 42, cx = 60, cy = 58;
  const len   = Math.PI * r;   // ≈131.9
  const fill  = pct * len;
  const color = pct >= 0.7 ? "#10b981" : pct >= 0.4 ? "#f59e0b" : "#ef4444";
  const bgColor = pct >= 0.7 ? "rgba(16,185,129,.08)" : pct >= 0.4 ? "rgba(245,158,11,.08)" : "rgba(239,68,68,.08)";

  // needle tip (shorter than arc radius)
  const ang = Math.PI * (1 - pct);
  const nx  = cx + 30 * Math.cos(ang);
  const ny  = cy - 30 * Math.sin(ang);

  // major ticks at 0 / 25 / 50 / 75 / 100 %
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const a = Math.PI * (1 - t);
    const isMajor = t === 0 || t === 0.5 || t === 1;
    return {
      x1: cx + (isMajor ? 35 : 37) * Math.cos(a),
      y1: cy - (isMajor ? 35 : 37) * Math.sin(a),
      x2: cx + 42 * Math.cos(a),
      y2: cy - 42 * Math.sin(a),
      major: isMajor,
    };
  });

  // tick labels at 0 / 50 / 100
  const tickLabels = [
    { t: 0,   txt: "0" },
    { t: 0.5, txt: "50" },
    { t: 1,   txt: "100" },
  ].map(({ t, txt }) => {
    const a = Math.PI * (1 - t);
    return { x: cx + 50 * Math.cos(a), y: cy - 50 * Math.sin(a) + 2, txt };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      {/* SVG — arc + needle only, no value text inside */}
      <svg width="210" height="110" viewBox="0 0 120 68" style={{ display: "block" }}>
        <defs>
          <filter id="gauge-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* background track */}
        <path
          d={`M 18,${cy} A ${r},${r} 0 0,0 102,${cy}`}
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" strokeLinecap="round"
        />

        {/* filled arc */}
        <path
          d={`M 18,${cy} A ${r},${r} 0 0,0 102,${cy}`}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${fill} ${len}`}
          filter="url(#gauge-glow)"
          style={{ transition: "stroke-dasharray .55s cubic-bezier(.4,0,.2,1), stroke .3s" }}
        />

        {/* ticks */}
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={t.major ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.12)"}
            strokeWidth={t.major ? 1.5 : 1} strokeLinecap="round"
          />
        ))}

        {/* tick labels */}
        {tickLabels.map((l) => (
          <text key={l.txt} x={l.x} y={l.y} textAnchor="middle" fontSize="6.5" fill="rgba(255,255,255,0.3)">
            {l.txt}
          </text>
        ))}

        {/* needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny}
          stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"
        />
        <circle cx={nx} cy={ny} r="2"   fill={color}/>
        <circle cx={cx} cy={cy} r="5"   fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
        <circle cx={cx} cy={cy} r="2.5" fill={color}/>
      </svg>

      {/* Value — outside SVG, crisp HTML rendering */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 3, lineHeight: 1, marginTop: 10 }}>
        <span style={{
          fontSize: 42,
          fontWeight: 800,
          color,
          letterSpacing: "-0.04em",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
          transition: "color .3s",
        }}>
          {Math.round(value)}
        </span>
        <span style={{ fontSize: 20, fontWeight: 600, color, opacity: 0.6, transition: "color .3s" }}>%</span>
      </div>
    </div>
  );
}

// ─── Scope horizontal bars ────────────────────────────────────────────────────
function ScopeBars({ scopes }) {
  if (!scopes.length) {
    return <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "12px 0" }}>Kapsam verisi yok</div>;
  }
  const maxVal = scopes[0].value;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
      {scopes.map((s) => {
        const pct = maxVal > 0 ? (s.value / maxVal) * 100 : 0;
        return (
          <div key={s.name}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }}/>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{s.name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  {s.count} sözleşme
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", minWidth: 56, textAlign: "right" }}>
                  {fmtUSD(s.value)}
                </span>
              </div>
            </div>
            <div style={{ height: 7, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{
                width: `${pct}%`, height: "100%", background: s.color,
                borderRadius: 999, transition: "width .5s ease",
              }}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Stage distribution ───────────────────────────────────────────────────────
function StageDist({ stageCounts, total }) {
  const entries = Object.entries(stageCounts).sort((a, b) => b[1] - a[1]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {entries.map(([stage, count]) => {
        const color = STAGE_DOT[stage] || "#94a3b8";
        const pct   = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={stage} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }}/>
            <span style={{ fontSize: 11, color: "var(--text-muted)", width: 130, flexShrink: 0 }}>{stage}</span>
            <div style={{ flex: 1, height: 6, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999, transition: "width .4s" }}/>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", width: 18, textAlign: "right" }}>{count}</span>
            <span style={{ fontSize: 10, color: "var(--text-muted)", width: 32, textAlign: "right" }}>{pct.toFixed(0)}%</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Customer health chips ─────────────────────────────────────────────────────
function CustomerChips({ contracts, usdRate, onNavigate }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
      {contracts.map((c) => {
        const stage   = normalizeStage(c.stage);
        const color   = STAGE_DOT[stage] || "#94a3b8";
        const days    = daysUntil(c.endDate);
        const expired = typeof days === "number" && days < 0;
        const urgent  = typeof days === "number" && days >= 0 && days <= 14;
        return (
          <button
            key={c.id}
            onClick={() => onNavigate && onNavigate(`/contracts/${c.id}`)}
            title={`${stage} · ${fmtUSD(toUSD(c.value, c.currency, usdRate))}${typeof days === "number" ? ` · ${days < 0 ? "Expired" : days + "d"}` : ""}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 11px 4px 8px",
              background: "var(--surface-raised)",
              border: `1px solid ${expired ? "rgba(239,68,68,.35)" : urgent ? "rgba(245,158,11,.35)" : "var(--border)"}`,
              borderRadius: 999,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 500,
              color: expired ? "#ef4444" : urgent ? "#f59e0b" : "var(--text-secondary)",
              transition: "all .12s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--hover-bg)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface-raised)"; }}
          >
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }}/>
            {c.customerName}
          </button>
        );
      })}
      {contracts.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Henüz müşteri yok</div>
      )}
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function Kpi({ label, value, sub, accent }) {
  return (
    <div style={{
      background: "var(--surface-raised)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "14px 18px",
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em", color: accent || "var(--text)" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ─── Team tab button ──────────────────────────────────────────────────────────
function TeamTab({ t, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
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
        gap: 7,
      }}
    >
      {t.team}
      <span style={{
        fontSize: 10, fontWeight: 700,
        background: isActive ? "rgba(255,255,255,.22)" : "var(--hover-bg)",
        borderRadius: 999, padding: "1px 6px",
        color: isActive ? "#fff" : "var(--text-muted)",
      }}>
        {t.contractCount}
      </span>
    </button>
  );
}

// ─── Section card wrapper ─────────────────────────────────────────────────────
function Card({ title, sub, children, style }) {
  return (
    <div style={{
      background: "var(--surface-raised)",
      border: "1px solid var(--border)",
      borderRadius: 14,
      padding: "18px 20px",
      ...style,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 18 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{title}</span>
        {sub && <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 400 }}>{sub}</span>}
      </div>
      {children}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Teams({ contracts = [], usdRate = 32, onNavigate }) {
  const teamData    = useTeamData(contracts, usdRate);
  const [activeTeam, setActiveTeam] = useState(null);

  const selected = useMemo(() => {
    if (!teamData.length) return null;
    const name = activeTeam || teamData[0]?.team;
    return teamData.find((t) => t.team === name) || teamData[0];
  }, [teamData, activeTeam]);

  if (!teamData.length) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Henüz sözleşme yok.</div>;
  }

  const hColor = selected
    ? selected.healthScore >= 70 ? "#10b981" : selected.healthScore >= 40 ? "#f59e0b" : "#ef4444"
    : "var(--text)";

  return (
    <div style={{ padding: "0 0 48px" }}>
      {/* Header */}
      <div style={{ padding: "28px 28px 0" }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text)" }}>Teams</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
          Takım bazlı analitik ve sözleşme sağlığı
        </p>
      </div>

      {/* Team tabs */}
      <div style={{ display: "flex", gap: 6, padding: "20px 28px 0", overflowX: "auto", scrollbarWidth: "none", flexWrap: "wrap" }}>
        {teamData.map((t) => (
          <TeamTab
            key={t.team}
            t={t}
            isActive={selected?.team === t.team}
            onClick={() => setActiveTeam(t.team)}
          />
        ))}
      </div>

      {selected && (
        <div style={{ padding: "20px 28px 0" }}>

          {/* KPI strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 20 }}>
            <Kpi label="Portföy Değeri" value={fmtUSD(selected.teamUSD)} sub={`Toplamın ${selected.pct.toFixed(1)}%'i`}/>
            <Kpi label="Müşteriler" value={selected.customers.length} sub={`${selected.contractCount} sözleşme`}/>
            <Kpi label="Sağlık Skoru" value={`${selected.healthScore}%`} sub="bileşik skor" accent={hColor}/>
            <Kpi label="Ort. Yenileme" value={selected.avgRate ? `${selected.avgRate}%` : "—"} sub="oran ortalaması"
              accent={selected.avgRate >= 70 ? "#10b981" : selected.avgRate >= 40 ? "#f59e0b" : "#ef4444"}/>
            <Kpi label="Risk" value={selected.atRisk} sub="≤30 gün kalan"
              accent={selected.atRisk > 0 ? "#f59e0b" : undefined}/>
            <Kpi label="Süresi Doldu" value={selected.expired} sub="churn / vadesi geçmiş"
              accent={selected.expired > 0 ? "#ef4444" : undefined}/>
          </div>

          {/* Main charts row */}
          <div style={{ display: "grid", gridTemplateColumns: "230px 1fr 1fr", gap: 16, marginBottom: 16, alignItems: "start" }}>

            {/* Gauge card */}
            <Card title="Takım Sağlığı" sub="composite score">
              <Gauge value={selected.healthScore}/>
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 9 }}>
                {[
                  { label: "Yenileme Oranı",  value: selected.avgRate ? `${selected.avgRate}%` : "—",  accent: selected.avgRate >= 70 ? "#10b981" : selected.avgRate >= 40 ? "#f59e0b" : "#ef4444" },
                  { label: "Pipeline'da",      value: selected.inPipeline,   accent: selected.inPipeline  > 0 ? "#3b82f6" : undefined },
                  { label: "Aktif Sözleşme",   value: selected.active,       accent: undefined },
                  { label: "Risk Altında",     value: selected.atRisk,       accent: selected.atRisk > 0 ? "#f59e0b" : undefined },
                ].map((r) => (
                  <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: r.accent || "var(--text-secondary)" }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Scope breakdown */}
            <Card title="Kapsam Dağılımı" sub="portföy değerine göre">
              <ScopeBars scopes={selected.scopes}/>
            </Card>

            {/* Customer chips */}
            <Card title="Müşteri Durumu" sub={`${selected.customers.length} müşteri`}>
              <CustomerChips contracts={selected.contracts} usdRate={usdRate} onNavigate={onNavigate}/>
            </Card>
          </div>

          {/* Stage distribution — full width */}
          <Card title="Stage Dağılımı" sub={`${selected.contractCount} sözleşme toplamı`}>
            <StageDist stageCounts={selected.stageCounts} total={selected.contractCount}/>
          </Card>

        </div>
      )}
    </div>
  );
}
