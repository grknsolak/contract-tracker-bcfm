import React, { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "../utils/date";
import { getFxLatest } from "../api";

function normalizeUsdValue(contract, rate) {
  const raw = Number(contract.value || 0);
  if (!raw) return 0;
  return contract.currency === "TL" ? (rate ? raw / rate : 0) : raw;
}

const TIER = [
  { min: 1, max: 1,  label: "Champion",  color: "#C4912A", bg: "rgba(196,145,42,0.12)" },
  { min: 2, max: 2,  label: "Challenger",color: "#8E9BAD", bg: "rgba(142,155,173,0.1)" },
  { min: 3, max: 3,  label: "Contender", color: "#B87333", bg: "rgba(184,115,51,0.1)"  },
  { min: 4, max: 6,  label: "Tier I",    color: "#6EE7B7", bg: "rgba(110,231,183,0.08)" },
  { min: 7, max: 10, label: "Tier II",   color: "#93C5FD", bg: "rgba(147,197,253,0.08)" },
];

function getTier(rank) {
  return TIER.find((t) => rank >= t.min && rank <= t.max) || TIER[TIER.length - 1];
}

// ── Score Ring (SVG donut) ───────────────────────────────────────────────────
function ScoreRing({ pct, color, size = 54 }) {
  const cx   = size / 2;
  const r    = cx - 7;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="seg-score-ring">
      {/* Track */}
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--border)" strokeWidth="4" />
      {/* Arc */}
      <circle
        cx={cx} cy={cx} r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={0}
        transform={`rotate(-90 ${cx} ${cx})`}
        className="seg-ring-arc"
      />
      {/* Percentage text */}
      <text x={cx} y={cx + 1} textAnchor="middle" dominantBaseline="middle"
        className="seg-ring-pct" fill={color}>
        {pct}%
      </text>
    </svg>
  );
}

// Crown / Medal icons
function CrownIcon({ size = 16, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M2 19h20v2H2v-2zM2 7l5 5 5-7 5 7 5-5-2 10H4L2 7z"/>
    </svg>
  );
}

function MedalIcon({ rank }) {
  const colors = { 1: "#C4912A", 2: "#8E9BAD", 3: "#B87333" };
  const c = colors[rank] || "var(--text-secondary)";
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6"/><path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72M4.11 15.08c3.44-1.48 8.33-1.48 11.77 0"/>
    </svg>
  );
}

// Podium block for top-3
function PodiumCard({ contract, rank, totalValue, onNavigate }) {
  const tier    = getTier(rank);
  const pct     = totalValue ? Math.round((contract.usdValue / totalValue) * 100) : 0;
  const heights = { 1: 160, 2: 126, 3: 108 };
  const h       = heights[rank] || 100;

  return (
    <button
      className={`seg-podium-card seg-podium-card--rank${rank}`}
      style={{ "--tier-color": tier.color, "--tier-bg": tier.bg, "--podium-h": `${h}px` }}
      onClick={() => onNavigate(`/contracts/${contract.id}`)}
    >
      {/* Rank badge */}
      <div className="seg-podium-rank">
        {rank === 1 && <CrownIcon size={14} color={tier.color} />}
        <span style={{ color: tier.color }}>#{rank}</span>
        <span className="seg-tier-pill" style={{ color: tier.color, borderColor: `${tier.color}40` }}>{tier.label}</span>
      </div>

      {/* Avatar / initials */}
      <div className="seg-podium-avatar" style={{ background: tier.bg, borderColor: `${tier.color}50` }}>
        <span style={{ color: tier.color }}>
          {contract.customerName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
        </span>
      </div>

      <div className="seg-podium-name">{contract.customerName}</div>
      <div className="seg-podium-meta">{contract.team} · {contract.scopes?.length || 0} scopes</div>

      {/* Value */}
      <div className="seg-podium-value" style={{ color: tier.color }}>
        {formatCurrency(contract.value, contract.currency)}
      </div>

      {/* Score ring */}
      <div className="seg-podium-ring-wrap">
        <ScoreRing pct={pct} color={tier.color} size={60} />
        <span className="seg-podium-ring-label" style={{ color: "var(--text-secondary)" }}>of total pool</span>
      </div>

      {/* Podium base */}
      <div className="seg-podium-base" style={{ height: `var(--podium-h)`, background: `${tier.color}18`, borderTop: `2px solid ${tier.color}50` }}>
        <span style={{ color: tier.color, fontSize: 28, fontWeight: 800, opacity: 0.15 }}>#{rank}</span>
      </div>
    </button>
  );
}

// Rank row for #4–10
function RankRow({ contract, rank, totalValue, onNavigate }) {
  const tier = getTier(rank);
  const pct  = totalValue ? Math.round((contract.usdValue / totalValue) * 100) : 0;

  return (
    <button
      className="seg-rank-row"
      style={{ "--tier-color": tier.color }}
      onClick={() => onNavigate(`/contracts/${contract.id}`)}
    >
      {/* Inner div carries the grid — button element can't reliably be a grid container */}
      <div className="seg-rank-row-inner">
        <div className="seg-rank-num" style={{ color: tier.color }}>
          {rank < 10 ? `0${rank}` : rank}
        </div>

        <div className="seg-rank-info">
          <span className="seg-rank-name">{contract.customerName}</span>
          <span className="seg-rank-sub">
            {contract.team}
            <span className="seg-tier-pill seg-tier-pill--row" style={{ color: tier.color, borderColor: `${tier.color}40`, background: tier.bg }}>
              {tier.label}
            </span>
          </span>
        </div>

        <div className="seg-rank-score">
          <ScoreRing pct={pct} color={tier.color} size={52} />
        </div>

        <div className="seg-rank-value">
          <span className="seg-rank-currency-tag">{contract.currency}</span>
          {formatCurrency(contract.value, contract.currency)}
        </div>
      </div>
    </button>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Segmentation({ contracts, onNavigate }) {
  const [fx, setFx]                   = useState({ rate: null, date: null, loading: true, error: null });
  const [selectedScope, setSelectedScope] = useState("All");

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const { data } = await getFxLatest("USD", "TRY");
        const rate = data?.rates?.TRY;
        if (on) setFx({ rate: typeof rate === "number" ? rate : null, date: data?.date, loading: false, error: null });
      } catch {
        if (on) setFx({ rate: null, date: null, loading: false, error: "FX unavailable" });
      }
    })();
    return () => { on = false; };
  }, []);

  const scopes = useMemo(() =>
    ["All", ...Array.from(new Set(contracts.flatMap((c) => c.scopes || [])))],
    [contracts]
  );

  const ranked = useMemo(() =>
    contracts
      .filter((c) => selectedScope === "All" || (c.scopes || []).includes(selectedScope))
      .map((c)   => ({ ...c, usdValue: normalizeUsdValue(c, fx.rate) }))
      .sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0))
      .slice(0, 10),
    [contracts, selectedScope, fx.rate]
  );

  const totalValue = useMemo(() => ranked.reduce((s, c) => s + (c.usdValue || 0), 0), [ranked]);
  const maxValue   = ranked[0]?.usdValue || 1;

  // Podium order: Silver (#2) | Gold (#1) | Bronze (#3)
  const podiumOrder = [ranked[1], ranked[0], ranked[2]].filter(Boolean);

  return (
    <div className="page">
      {/* ── Header ── */}
      <div className="details-header">
        <div>
          <div className="breadcrumb">Segmentation / Revenue Leaderboard</div>
          <h2>Revenue Leaderboard</h2>
          <p className="muted">Ranked by contract value — pick a scope to filter competitors.</p>
        </div>
        <div className="details-meta">
          {fx.loading ? (
            <span className="seg-fx-badge seg-fx-badge--loading">Loading FX…</span>
          ) : fx.error ? (
            <span className="seg-fx-badge seg-fx-badge--error">FX unavailable</span>
          ) : (
            <span className="seg-fx-badge">USD/TRY: {fx.rate?.toFixed(2)} ({fx.date})</span>
          )}
        </div>
      </div>

      {/* ── Scope filter ── */}
      <div className="seg-scope-bar">
        <div className="seg-scope-meta">
          <span className="seg-scope-meta-label">Scope</span>
          <strong>{selectedScope === "All" ? "All scopes" : selectedScope}</strong>
          <span className="muted">{ranked.length} competitors · {formatCurrency(totalValue, "USD")} prize pool</span>
        </div>
        <div className="seg-scope-chips">
          {scopes.map((s) => (
            <button
              key={s}
              className={`seg-scope-chip ${selectedScope === s ? "seg-scope-chip--active" : ""}`}
              onClick={() => setSelectedScope(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {ranked.length === 0 ? (
        <div className="seg-empty">No customers mapped to this scope yet.</div>
      ) : (
        <div className="seg-leaderboard">

          {/* ── Podium top-3 ── */}
          {ranked.length >= 1 && (
            <div className="seg-podium-wrap">
              {podiumOrder.map((contract) => {
                const rank = ranked.indexOf(contract) + 1;
                return (
                  <PodiumCard
                    key={contract.id}
                    contract={contract}
                    rank={rank}
                    totalValue={totalValue}
                    onNavigate={onNavigate}
                  />
                );
              })}
            </div>
          )}

          {/* ── Rank rows #4–10 ── */}
          {ranked.length > 3 && (
            <div className="seg-rank-list">
              <div className="seg-rank-list-header">
                <span>RANK</span>
                <span>CUSTOMER</span>
                <span>SCORE</span>
                <span>VALUE</span>
              </div>
              {ranked.slice(3).map((contract, i) => (
                <RankRow
                  key={contract.id}
                  contract={contract}
                  rank={i + 4}
                  totalValue={totalValue}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
