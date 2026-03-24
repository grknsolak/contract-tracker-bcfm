import React, { useMemo, useState } from "react";
import Card from "../components/Card";
import RevenueStackedChart from "../components/RevenueStackedChart";
import { formatCurrency } from "../utils/date";
import { buildRevenueAnalytics } from "../utils/revenueAnalytics";

const RANGE_PRESETS = [
  { id: "3m",  label: "3M",  months: 3  },
  { id: "6m",  label: "6M",  months: 6  },
  { id: "9m",  label: "9M",  months: 9  },
  { id: "12m", label: "1Y",  months: 12 },
  { id: "max", label: "MAX", months: null },
];

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function shiftMonth(key, offset) {
  if (!key) return "";
  const [year, month] = key.split("-").map(Number);
  const d = new Date(year, month - 1 + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthKey(year, monthIndex) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function formatMonthDisplay(key) {
  if (!key) return "—";
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// ── Dual Month Picker ────────────────────────────────────────────────────────
function DualMonthPicker({ startKey, endKey, onStartChange, onEndChange, availableMonths, rangePreset, onPresetChange }) {
  const today = new Date();
  const todayKey = formatMonthKey(today.getFullYear(), today.getMonth());

  const availableSet = useMemo(() => new Set(availableMonths.map((m) => m.key)), [availableMonths]);
  const allYears = useMemo(() => [...new Set(availableMonths.map((m) => parseInt(m.key)))].sort(), [availableMonths]);
  const minYear = allYears[0] ?? today.getFullYear();
  const maxYear = allYears[allYears.length - 1] ?? today.getFullYear();

  const [leftYear,  setLeftYear]  = useState(() => startKey ? parseInt(startKey) : minYear);
  const [rightYear, setRightYear] = useState(() => endKey   ? parseInt(endKey)   : maxYear);

  const classFor = (key) => {
    const classes = ["dmp-month"];
    if (!availableSet.has(key))            classes.push("dmp-month--disabled");
    if (key === startKey)                  classes.push("dmp-month--start");
    if (key === endKey)                    classes.push("dmp-month--end");
    if (startKey && endKey && key > startKey && key < endKey) classes.push("dmp-month--range");
    if (key === todayKey)                  classes.push("dmp-month--today");
    return classes.join(" ");
  };

  const renderCal = (year, setYear, side) => (
    <div className="dmp-cal">
      <div className="dmp-cal-head">
        <button className="dmp-nav" onClick={() => setYear((y) => Math.max(y - 1, minYear))} disabled={year <= minYear}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span className="dmp-cal-year">{year}</span>
        <button className="dmp-nav" onClick={() => setYear((y) => Math.min(y + 1, maxYear))} disabled={year >= maxYear}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <div className="dmp-months-grid">
        {MONTH_LABELS.map((label, i) => {
          const key = formatMonthKey(year, i);
          const disabled = !availableSet.has(key);
          return (
            <button
              key={key}
              disabled={disabled}
              className={classFor(key)}
              onClick={() => {
                if (side === "left") {
                  onStartChange(key);
                  if (endKey && key > endKey) onEndChange(key);
                } else {
                  onEndChange(key);
                  if (startKey && key < startKey) onStartChange(key);
                }
              }}
            >
              <span className="dmp-month-label">{label}</span>
              {key === todayKey && <span className="dmp-today-dot" />}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="dmp">
      {/* Preset strip */}
      <div className="dmp-presets">
        {RANGE_PRESETS.map((p) => (
          <button
            key={p.id}
            className={`dmp-preset ${rangePreset === p.id ? "dmp-preset--active" : ""}`}
            onClick={() => onPresetChange(p.id)}
          >
            {p.label}
          </button>
        ))}
        <div className="dmp-presets-divider" />
        <span className="dmp-range-summary">
          {formatMonthDisplay(startKey)}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.4}}>
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
          {formatMonthDisplay(endKey)}
        </span>
      </div>

      {/* Dual calendars */}
      <div className="dmp-calendars">
        {renderCal(leftYear,  setLeftYear,  "left")}
        <div className="dmp-cal-sep" />
        {renderCal(rightYear, setRightYear, "right")}
      </div>
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────
export default function RevenueDashboard({ contracts }) {
  const [teamFilter, setTeamFilter] = useState("All");
  const [rangePreset, setRangePreset] = useState("12m");
  const teams = useMemo(
    () => ["All", ...Array.from(new Set(contracts.map((c) => c.team).filter(Boolean)))],
    [contracts]
  );

  const baseAnalytics = useMemo(() => buildRevenueAnalytics(contracts, teamFilter), [contracts, teamFilter]);
  const defaultEndKey   = baseAnalytics.latestMonthKey || "";
  const defaultStartKey =
    rangePreset === "custom" || rangePreset === "max"
      ? (baseAnalytics.allMonths[0]?.key || "")
      : shiftMonth(defaultEndKey, -((RANGE_PRESETS.find((p) => p.id === rangePreset)?.months || 12) - 1));

  const [manualRange, setManualRange] = useState({ startKey: "", endKey: "" });

  const effectiveRange = useMemo(() => {
    if (rangePreset === "custom") {
      return {
        startKey: manualRange.startKey || baseAnalytics.allMonths[0]?.key || "",
        endKey:   manualRange.endKey   || defaultEndKey,
      };
    }
    return { startKey: defaultStartKey, endKey: defaultEndKey };
  }, [rangePreset, manualRange, baseAnalytics.allMonths, defaultEndKey, defaultStartKey]);

  const analytics      = useMemo(() => buildRevenueAnalytics(contracts, teamFilter, effectiveRange), [contracts, teamFilter, effectiveRange]);
  const availableMonths = baseAnalytics.allMonths;

  const handlePresetChange = (id) => {
    setRangePreset(id);
    setManualRange({ startKey: "", endKey: "" });
  };

  const handleStartChange = (key) => {
    setRangePreset("custom");
    setManualRange((c) => ({ ...c, startKey: key }));
  };

  const handleEndChange = (key) => {
    setRangePreset("custom");
    setManualRange((c) => ({ ...c, endKey: key }));
  };

  return (
    <div className="page">
      <div className="details-header">
        <div>
          <div className="breadcrumb">Finance / MRR & NRR</div>
          <h2>MRR & NRR Revenue Dashboard</h2>
          <p className="muted">Track total revenue trends and scope mix by selected team and time range.</p>
        </div>
      </div>

      {/* ── Filter card ── */}
      <Card title="Filters" subtitle="Select team and reporting window" className="revenue-filter-card">
        {/* Team row */}
        <div className="dmp-team-row">
          <span className="rfi-label">Team</span>
          <div className="rfi-select-wrap">
            <select className="rfi-select" value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
              {teams.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <svg className="rfi-select-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          <span className="dmp-team-meta">{analytics.months.length} months selected</span>
        </div>

        {/* Dual month picker */}
        <DualMonthPicker
          startKey={effectiveRange.startKey}
          endKey={effectiveRange.endKey}
          onStartChange={handleStartChange}
          onEndChange={handleEndChange}
          availableMonths={availableMonths}
          rangePreset={rangePreset}
          onPresetChange={handlePresetChange}
        />
      </Card>

      {/* ── KPI row ── */}
      <div className="page-grid">
        <Card className="stat-card">
          <div className="stat-label">Monthly MRR</div>
          <div className="stat-value">{formatCurrency(analytics.monthly.mrr, "USD")}</div>
          <div className="stat-meta">Latest MRR month: {analytics.latestMRRMonthLabel}</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-label">Monthly NRR</div>
          <div className="stat-value">{formatCurrency(analytics.monthly.nrr, "USD")}</div>
          <div className="stat-meta">Latest NRR month: {analytics.latestNRRMonthLabel}</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-label">Range MRR</div>
          <div className="stat-value">{formatCurrency(analytics.rangeTotal.mrr, "USD")}</div>
          <div className="stat-meta">{analytics.months[0]?.label || "-"} → {analytics.latestMonthLabel}</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-label">Range NRR</div>
          <div className="stat-value">{formatCurrency(analytics.rangeTotal.nrr, "USD")}</div>
          <div className="stat-meta">{analytics.months[0]?.label || "-"} → {analytics.latestMonthLabel}</div>
        </Card>
      </div>

      <div className="split-grid">
        <RevenueStackedChart title="Total MRR trend" subtitle="Monthly total MRR from past to present" data={analytics.monthlyMRRSeries} mode="total" />
        <RevenueStackedChart title="MRR scope distribution" subtitle="How total MRR is split across scopes each month" data={analytics.monthlyMRRSeries} mode="scopes" />
      </div>

      <div className="split-grid">
        <RevenueStackedChart title="Total NRR trend" subtitle="Monthly total NRR from past to present" data={analytics.monthlyNRRSeries} mode="total" />
        <RevenueStackedChart title="NRR scope distribution" subtitle="How total NRR is split across scopes each month" data={analytics.monthlyNRRSeries} mode="scopes" />
      </div>

      <div className="split-grid">
        <Card title="MRR breakdown" subtitle="Selected range by service">
          <div className="scorecard-list">
            {analytics.breakdown.MRR.map((item) => (
              <div key={item.scope} className="scorecard-row">
                <div className="scorecard-title-wrap">
                  <span className="legend-dot" style={{ background: item.color }} />
                  <div className="legend-label">{item.scope}</div>
                </div>
                <div className="scorecard-value">{formatCurrency(item.value, "USD")}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="NRR breakdown" subtitle="Selected range by service">
          <div className="scorecard-list">
            {analytics.breakdown.NRR.map((item) => (
              <div key={item.scope} className="scorecard-row">
                <div className="scorecard-title-wrap">
                  <span className="legend-dot" style={{ background: item.color }} />
                  <div className="legend-label">{item.scope}</div>
                </div>
                <div className="scorecard-value">{formatCurrency(item.value, "USD")}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
