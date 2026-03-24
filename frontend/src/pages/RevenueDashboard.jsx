import React, { useMemo, useState } from "react";
import Card from "../components/Card";
import RevenueStackedChart from "../components/RevenueStackedChart";
import { formatCurrency } from "../utils/date";
import { buildRevenueAnalytics } from "../utils/revenueAnalytics";

const RANGE_PRESETS = [
  { id: "3m", label: "3M", months: 3 },
  { id: "6m", label: "6M", months: 6 },
  { id: "9m", label: "9M", months: 9 },
  { id: "12m", label: "1Y", months: 12 },
  { id: "max", label: "MAX", months: null },
];

function shiftMonth(key, offset) {
  if (!key) return "";
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthDisplay(key) {
  if (!key) return "Select";
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function RevenueDashboard({ contracts }) {
  const [teamFilter, setTeamFilter] = useState("All");
  const [rangePreset, setRangePreset] = useState("12m");
  const teams = useMemo(() => ["All", ...Array.from(new Set(contracts.map((contract) => contract.team).filter(Boolean)))], [contracts]);
  const baseAnalytics = useMemo(() => buildRevenueAnalytics(contracts, teamFilter), [contracts, teamFilter]);
  const defaultEndKey = baseAnalytics.latestMonthKey || "";
  const defaultStartKey = rangePreset === "custom"
    ? (baseAnalytics.allMonths[0]?.key || "")
    : rangePreset === "max"
      ? (baseAnalytics.allMonths[0]?.key || "")
      : shiftMonth(defaultEndKey, -((RANGE_PRESETS.find((item) => item.id === rangePreset)?.months || 12) - 1));
  const [manualRange, setManualRange] = useState({ startKey: "", endKey: "" });
  const effectiveRange = useMemo(() => {
    if (rangePreset === "custom") {
      return {
        startKey: manualRange.startKey || baseAnalytics.allMonths[0]?.key || "",
        endKey: manualRange.endKey || defaultEndKey,
      };
    }
    return {
      startKey: defaultStartKey,
      endKey: defaultEndKey,
    };
  }, [rangePreset, manualRange, baseAnalytics.allMonths, defaultEndKey, defaultStartKey]);
  const analytics = useMemo(
    () => buildRevenueAnalytics(contracts, teamFilter, effectiveRange),
    [contracts, teamFilter, effectiveRange]
  );
  const availableMonths = baseAnalytics.allMonths;

  const handlePresetChange = (presetId) => {
    setRangePreset(presetId);
  };

  const handleCustomRange = () => {
    setRangePreset("custom");
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

      <Card title="Filters" subtitle="Executive controls for team and reporting window" className="revenue-filter-card">
        <div className="rfi-bar">
          {/* Team select */}
          <div className="rfi-group">
            <span className="rfi-label">Team</span>
            <div className="rfi-select-wrap">
              <select className="rfi-select" value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
                {teams.map((team) => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
              <svg className="rfi-select-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>

          <div className="rfi-divider" />

          {/* Range segmented control */}
          <div className="rfi-group">
            <span className="rfi-label">Range</span>
            <div className="rfi-segments">
              {RANGE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`rfi-seg ${rangePreset === preset.id ? "is-active" : ""}`}
                  onClick={() => handlePresetChange(preset.id)}
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                className={`rfi-seg ${rangePreset === "custom" ? "is-active" : ""}`}
                onClick={handleCustomRange}
              >
                Custom
              </button>
            </div>
          </div>

          <div className="rfi-divider" />

          {/* Window badge */}
          <div className="rfi-group">
            <span className="rfi-label">Window</span>
            <div className="rfi-window">
              <span className="rfi-window-date">{formatMonthDisplay(effectiveRange.startKey)}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{opacity: 0.4}}>
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
              <span className="rfi-window-date">{formatMonthDisplay(effectiveRange.endKey)}</span>
              <span className="rfi-window-pill">{analytics.months.length}mo</span>
            </div>
          </div>
        </div>

        {/* Custom range expander */}
        {rangePreset === "custom" && (
          <div className="rfi-custom">
            <div className="rfi-custom-field">
              <span className="rfi-label">Start month</span>
              <select
                className="rfi-select rfi-month-select"
                value={manualRange.startKey || effectiveRange.startKey}
                onChange={(e) => { setRangePreset("custom"); setManualRange((c) => ({ ...c, startKey: e.target.value })); }}
              >
                {availableMonths
                  .filter((m) => !(manualRange.endKey || defaultEndKey) || m.key <= (manualRange.endKey || defaultEndKey))
                  .map((m) => <option key={`s-${m.key}`} value={m.key}>{formatMonthDisplay(m.key)}</option>)}
              </select>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.4, marginTop:20}}>
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
            <div className="rfi-custom-field">
              <span className="rfi-label">End month</span>
              <select
                className="rfi-select rfi-month-select"
                value={manualRange.endKey || defaultEndKey}
                onChange={(e) => { setRangePreset("custom"); setManualRange((c) => ({ ...c, endKey: e.target.value })); }}
              >
                {availableMonths
                  .filter((m) => m.key >= (manualRange.startKey || availableMonths[0]?.key || ""))
                  .map((m) => <option key={`e-${m.key}`} value={m.key}>{formatMonthDisplay(m.key)}</option>)}
              </select>
            </div>
          </div>
        )}
      </Card>

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
        <RevenueStackedChart
          title="Total MRR trend"
          subtitle="Monthly total MRR from past to present"
          data={analytics.monthlyMRRSeries}
          mode="total"
        />
        <RevenueStackedChart
          title="MRR scope distribution"
          subtitle="How total MRR is split across scopes each month"
          data={analytics.monthlyMRRSeries}
          mode="scopes"
        />
      </div>

      <div className="split-grid">
        <RevenueStackedChart
          title="Total NRR trend"
          subtitle="Monthly total NRR from past to present"
          data={analytics.monthlyNRRSeries}
          mode="total"
        />
        <RevenueStackedChart
          title="NRR scope distribution"
          subtitle="How total NRR is split across scopes each month"
          data={analytics.monthlyNRRSeries}
          mode="scopes"
        />
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
