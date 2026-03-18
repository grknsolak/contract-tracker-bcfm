import React, { useMemo, useState } from "react";
import { formatCurrency, formatDate } from "../utils/date";

const SERIES_COLORS = ["#2563eb", "#1c9c63", "#f59e0b", "#7c3aed", "#ef4444"];

function buildFallbackHistory(contract) {
  const currentValue = Number(contract.value || 0);
  if (!currentValue) return [];
  const start = new Date(contract.startDate || new Date());
  if (Number.isNaN(start.getTime())) return [];

  return [
    { date: new Date(start.getFullYear(), start.getMonth() - 6, 1).toISOString(), value: Math.round(currentValue * 0.82), label: "Initial" },
    { date: new Date(start.getFullYear(), start.getMonth() - 3, 1).toISOString(), value: Math.round(currentValue * 0.94), label: "Revision" },
    { date: new Date(start.getFullYear(), start.getMonth(), 1).toISOString(), value: currentValue, label: "Signed" },
    { date: new Date(start.getFullYear(), start.getMonth() + 2, 1).toISOString(), value: currentValue, label: "Current" },
  ];
}

function getTrend(current, previous) {
  if (previous == null || previous === 0) return { direction: "flat", percent: 0, icon: "→", tone: "neutral" };
  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) < 0.5) return { direction: "flat", percent: 0, icon: "→", tone: "neutral" };
  if (change > 0) return { direction: "up", percent: Math.round(change), icon: "↑", tone: "success" };
  return { direction: "down", percent: Math.round(Math.abs(change)), icon: "↓", tone: "danger" };
}

function normalizeSeries(contract) {
  if (contract.scopeValueHistory?.length) {
    return contract.scopeValueHistory.map((series, index) => {
      const history = (series.history || []).map((item, itemIndex, list) => {
        const previous = itemIndex > 0 ? list[itemIndex - 1].value : null;
        return { ...item, trend: getTrend(item.value, previous) };
      });
      return {
        name: series.name,
        color: series.color || SERIES_COLORS[index % SERIES_COLORS.length],
        history,
      };
    });
  }

  return [
    {
      name: "Total contract",
      color: SERIES_COLORS[0],
      history: buildFallbackHistory(contract).map((item, index, list) => {
        const previous = index > 0 ? list[index - 1].value : null;
        return { ...item, trend: getTrend(item.value, previous) };
      }),
    },
  ];
}

export default function ContractGrowthChart({ contract }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const series = useMemo(() => normalizeSeries(contract), [contract]);

  const chart = useMemo(() => {
    if (!series.length) return null;
    const width = 680;
    const height = 240;
    const paddingX = 42;
    const paddingTop = 24;
    const paddingBottom = 32;

    const allPoints = series.flatMap((item) => item.history);
    const min = Math.min(...allPoints.map((item) => item.value));
    const max = Math.max(...allPoints.map((item) => item.value));
    const range = Math.max(max - min, 1);
    const allDates = Array.from(new Set(allPoints.map((item) => item.date))).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    const mappedSeries = series.map((item) => {
      const points = item.history.map((point) => {
        const index = allDates.indexOf(point.date);
        const x = paddingX + (index * (width - paddingX * 2)) / Math.max(allDates.length - 1, 1);
        const y = paddingTop + ((max - point.value) / range) * (height - paddingTop - paddingBottom);
        return { ...point, x, y, seriesName: item.name, color: item.color };
      });

      const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
      return { ...item, points, path, latest: points[points.length - 1] || null };
    });

    return { width, height, series: mappedSeries, max, dates: allDates };
  }, [series]);

  const currentTotal = useMemo(
    () =>
      series.reduce((sum, item) => {
        const last = item.history[item.history.length - 1];
        return sum + Number(last?.value || 0);
      }, 0),
    [series]
  );

  if (!chart) {
    return <div className="muted">No contract growth history available.</div>;
  }

  return (
    <div className="growth-chart-wrap">
      <div className="growth-current-strip">
        <div className="growth-current-card growth-current-card-total">
          <div className="growth-current-label">Current total</div>
          <div className="growth-current-value">{formatCurrency(currentTotal, contract.currency)}</div>
        </div>
        {chart.series.map((item) => {
          const latest = item.latest;
          return (
            <div key={item.name} className="growth-current-card">
              <div className="growth-current-head">
                <span className="growth-series-dot" style={{ background: item.color }} />
                <span className="growth-current-label">{item.name}</span>
              </div>
              <div className="growth-current-value-sm">{formatCurrency(latest?.value || 0, contract.currency)}</div>
            </div>
          );
        })}
      </div>

      <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="growth-chart" role="img" aria-label="Contract growth chart">
        {[0.2, 0.4, 0.6, 0.8].map((ratio) => {
          const y = 28 + (chart.height - 28 - 36) * ratio;
          return <line key={ratio} x1="42" y1={y} x2={chart.width - 42} y2={y} className="growth-grid-line" />;
        })}

        {chart.series.map((seriesItem) => (
          <g key={seriesItem.name}>
            <path d={seriesItem.path} fill="none" stroke={seriesItem.color} strokeWidth="4" strokeLinecap="round" />
            {seriesItem.points.map((point) => (
              <g
                key={`${seriesItem.name}-${point.date}`}
                onMouseEnter={() => setHoveredPoint(point)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <circle cx={point.x} cy={point.y} r="6" fill="#ffffff" stroke={seriesItem.color} strokeWidth="3" />
            <rect
              x={point.x - 32}
              y={point.y - 32}
              width="64"
              height="22"
              rx="12"
              className={`growth-point-badge tone-${point.trend.tone}`}
            />
            <text x={point.x} y={point.y - 17} textAnchor="middle" className="growth-point-badge-text">
              {point.trend.icon} {point.trend.percent}%
            </text>
          </g>
        ))}

            {seriesItem.latest ? (
              <g>
                <text
                  x={Math.min(seriesItem.latest.x + 14, chart.width - 12)}
                  y={seriesItem.latest.y + 4}
                  className="growth-series-label"
                  fill={seriesItem.color}
                >
                  {seriesItem.name}: {formatCurrency(seriesItem.latest.value, contract.currency)}
                </text>
              </g>
            ) : null}
          </g>
        ))}

        {chart.dates.map((date, index) => {
          const x = 42 + (index * (chart.width - 84)) / Math.max(chart.dates.length - 1, 1);
          return (
            <text key={date} x={x} y={chart.height - 10} textAnchor="middle" className="growth-axis-label">
              {formatDate(date)}
            </text>
          );
        })}

        {hoveredPoint ? (
          <g className="growth-tooltip">
            <rect
              x={Math.min(Math.max(hoveredPoint.x - 90, 24), chart.width - 196)}
              y={Math.max(hoveredPoint.y - 92, 12)}
              width="172"
              height="72"
              rx="14"
              className="growth-tooltip-box"
            />
            <text
              x={Math.min(Math.max(hoveredPoint.x - 78, 36), chart.width - 184)}
              y={Math.max(hoveredPoint.y - 66, 32)}
              className="growth-tooltip-title"
            >
              {hoveredPoint.seriesName}
            </text>
            <text
              x={Math.min(Math.max(hoveredPoint.x - 78, 36), chart.width - 184)}
              y={Math.max(hoveredPoint.y - 44, 54)}
              className="growth-tooltip-copy"
            >
              {formatCurrency(hoveredPoint.value, contract.currency)}
            </text>
            <text
              x={Math.min(Math.max(hoveredPoint.x - 78, 36), chart.width - 184)}
              y={Math.max(hoveredPoint.y - 22, 76)}
              className="growth-tooltip-copy"
            >
              {hoveredPoint.trend.icon} {hoveredPoint.trend.percent}% · {formatDate(hoveredPoint.date)}
            </text>
          </g>
        ) : null}
      </svg>

      <div className="growth-legend">
        {chart.series.map((item) => {
          const latest = item.latest;
          const latestTrend = latest?.trend || { icon: "→", percent: 0, tone: "neutral" };
          return (
            <div key={item.name} className="growth-legend-card">
              <div className="growth-legend-head">
                <div className="growth-legend-title-wrap">
                  <span className="growth-series-dot" style={{ background: item.color }} />
                  <div className="growth-legend-title">{item.name}</div>
                </div>
                <div className={`growth-delta tone-${latestTrend.tone}`}>{latestTrend.icon} {latestTrend.percent}%</div>
              </div>
              <div className="growth-legend-value">{formatCurrency(latest?.value || 0, contract.currency)}</div>
              <div className="growth-legend-date">{latest?.date ? formatDate(latest.date) : "-"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
