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
        <div className="revenue-filter-shell">
          <div className="revenue-filter-topline">
            <div className="revenue-filter-block revenue-filter-team">
              <div className="revenue-filter-label">Team</div>
              <select className="revenue-team-select" value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}>
                {teams.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </div>

            <div className="revenue-filter-block revenue-filter-summary">
              <div className="revenue-filter-label">Selected window</div>
              <div className="revenue-range-window">
                <strong>{formatMonthDisplay(effectiveRange.startKey)}</strong>
                <span className="revenue-range-arrow">→</span>
                <strong>{formatMonthDisplay(effectiveRange.endKey)}</strong>
              </div>
              <div className="revenue-range-meta">
                <span>{teamFilter === "All" ? "All teams" : teamFilter}</span>
                <span>{analytics.months.length} months</span>
                <span>{rangePreset === "custom" ? "Custom range" : (RANGE_PRESETS.find((item) => item.id === rangePreset)?.label || "Range")}</span>
              </div>
            </div>
          </div>

          <div className="revenue-filter-bottomline">
            <div className="revenue-filter-block revenue-filter-preset-block">
              <div className="revenue-filter-label">Quick range</div>
              <div className="range-chip-row premium-range-chip-row">
                {RANGE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`range-chip premium-range-chip ${rangePreset === preset.id ? "active" : ""}`}
                    onClick={() => handlePresetChange(preset.id)}
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  type="button"
                  className={`range-chip premium-range-chip ${rangePreset === "custom" ? "active" : ""}`}
                  onClick={handleCustomRange}
                >
                  Custom
                </button>
              </div>
            </div>
          </div>

          {rangePreset === "custom" ? (
            <div className="revenue-custom-inline">
              <div className="revenue-custom-field">
                <span className="revenue-filter-label">Start month</span>
                <select
                  className="revenue-month-select"
                  value={manualRange.startKey || effectiveRange.startKey}
                  onChange={(event) => {
                    setRangePreset("custom");
                    setManualRange((current) => ({ ...current, startKey: event.target.value }));
                  }}
                >
                  {availableMonths
                    .filter((month) => !(manualRange.endKey || defaultEndKey) || month.key <= (manualRange.endKey || defaultEndKey))
                    .map((month) => (
                      <option key={`start-${month.key}`} value={month.key}>
                        {formatMonthDisplay(month.key)}
                      </option>
                    ))}
                </select>
              </div>

              <div className="revenue-custom-divider" aria-hidden>
                →
              </div>

              <div className="revenue-custom-field">
                <span className="revenue-filter-label">End month</span>
                <select
                  className="revenue-month-select"
                  value={manualRange.endKey || defaultEndKey}
                  onChange={(event) => {
                    setRangePreset("custom");
                    setManualRange((current) => ({ ...current, endKey: event.target.value }));
                  }}
                >
                  {availableMonths
                    .filter((month) => month.key >= (manualRange.startKey || availableMonths[0]?.key || ""))
                    .map((month) => (
                      <option key={`end-${month.key}`} value={month.key}>
                        {formatMonthDisplay(month.key)}
                      </option>
                    ))}
                </select>
              </div>

              <div className="revenue-custom-summary">
                <span className="revenue-filter-label">Range summary</span>
                <div className="revenue-custom-summary-value">
                  {formatMonthDisplay(manualRange.startKey || effectiveRange.startKey)} → {formatMonthDisplay(manualRange.endKey || defaultEndKey)}
                </div>
                <div className="revenue-range-meta">
                  <span>{analytics.months.length} months</span>
                  <span>{teamFilter === "All" ? "All teams" : teamFilter}</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </Card>

      <div className="page-grid">
        <Card className="stat-card">
          <div className="stat-label">Monthly MRR</div>
          <div className="stat-value">{formatCurrency(analytics.monthly.mrr, "USD")}</div>
          <div className="stat-meta">Latest month: {analytics.latestMonthLabel}</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-label">Monthly NRR</div>
          <div className="stat-value">{formatCurrency(analytics.monthly.nrr, "USD")}</div>
          <div className="stat-meta">Latest month: {analytics.latestMonthLabel}</div>
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
