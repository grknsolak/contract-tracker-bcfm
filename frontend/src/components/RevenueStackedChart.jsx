import React, { useMemo, useState } from "react";
import { formatCurrency } from "../utils/date";
import { useResponsiveContainer } from "../hooks/useResponsiveContainer";

function buildSmoothPath(points) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const controlX = (current.x + next.x) / 2;
    path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
  }
  return path;
}

function formatCompactRevenue(value) {
  const amount = Number(value || 0);
  if (!amount) return "$0";
  if (Math.abs(amount) >= 1000000) {
    const short = (amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 1);
    return `${short}M$`;
  }
  if (Math.abs(amount) >= 1000) {
    const short = (amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1);
    return `${short}K$`;
  }
  return `${Math.round(amount)}$`;
}

export default function RevenueStackedChart({
  title,
  subtitle,
  data = [],
  mode = "total",
}) {
  const [expanded, setExpanded] = useState(false);
  const { ref: totalChartRef, size: totalChartSize } = useResponsiveContainer();
  const { ref: donutChartRef } = useResponsiveContainer();
  const legendItems = Array.from(
    new Map(data.flatMap((item) => item.segments || []).map((segment) => [segment.label, segment])).values()
  );
  const pieData = useMemo(() => {
    if (mode !== "scopes" || !data.length) return null;
    const scopeMap = {};
    data.forEach((point) => {
      (point.segments || []).forEach((segment) => {
        scopeMap[segment.label] = {
          label: segment.label,
          color: segment.color,
          value: (scopeMap[segment.label]?.value || 0) + Number(segment.value || 0),
        };
      });
    });

    const segments = Object.values(scopeMap).filter((item) => item.value > 0);
    const total = segments.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = -Math.PI / 2;

    const arcs = segments.map((segment) => {
      const ratio = total ? segment.value / total : 0;
      const angle = ratio * Math.PI * 2;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      const cx = 180;
      const cy = 180;
      const outerRadius = 122;
      const innerRadius = 72;

      const x1 = cx + outerRadius * Math.cos(startAngle);
      const y1 = cy + outerRadius * Math.sin(startAngle);
      const x2 = cx + outerRadius * Math.cos(endAngle);
      const y2 = cy + outerRadius * Math.sin(endAngle);
      const x3 = cx + innerRadius * Math.cos(endAngle);
      const y3 = cy + innerRadius * Math.sin(endAngle);
      const x4 = cx + innerRadius * Math.cos(startAngle);
      const y4 = cy + innerRadius * Math.sin(startAngle);
      const largeArcFlag = angle > Math.PI ? 1 : 0;
      const path = [
        `M ${x1} ${y1}`,
        `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        `L ${x3} ${y3}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
        "Z",
      ].join(" ");

      const midAngle = startAngle + angle / 2;
      const labelRadius = 147;

      return {
        ...segment,
        ratio,
        percent: ratio * 100,
        path,
        labelX: cx + labelRadius * Math.cos(midAngle),
        labelY: cy + labelRadius * Math.sin(midAngle),
      };
    });

    return { arcs, total };
  }, [data, mode]);

  const totalChart = useMemo(() => {
    if (mode !== "total" || !data.length) return null;

    const pointCount = data.length;
    const width = Math.max(totalChartSize.width || 0, 320);
    const height = Math.max(totalChartSize.height || width * 0.42, width * 0.42);
    const paddingX = width * 0.05;
    const paddingTop = height * 0.12;
    const paddingBottom = height * 0.14;
    const max = Math.max(...data.map((item) => item.total || 0), 0);
    const min = 0;
    const range = Math.max(max - min, 1);

    const points = data.map((item, index) => {
      const x = paddingX + (index * (width - paddingX * 2)) / Math.max(data.length - 1, 1);
      const y = paddingTop + ((max - (item.total || 0)) / range) * (height - paddingTop - paddingBottom);
      return { ...item, x, y };
    });

    const path = buildSmoothPath(points);
    const areaPath = `${path} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;
    const maxPoint = points.reduce((best, point) => (point.total > best.total ? point : best), points[0]);
    const minPoint = points.reduce((best, point) => (point.total < best.total ? point : best), points[0]);
    const lastPoint = points[points.length - 1];
    const compact = pointCount >= 10;
    const dense = pointCount >= 14;
    return { width, height, points, path, areaPath, max, maxPoint, minPoint, lastPoint, compact, dense };
  }, [data, mode, totalChartSize.height, totalChartSize.width]);

  if (!data.length) return null;

  const renderTotalChart = (isExpanded = false) => (
    <div ref={totalChartRef} className={`revenue-trend-chart-wrap ${isExpanded ? "expanded" : ""}`}>
      <svg
        viewBox={`0 0 ${totalChart.width} ${totalChart.height}`}
        className="revenue-trend-chart"
        preserveAspectRatio="xMinYMin meet"
        role="img"
        aria-label={title}
      >
        <defs>
          <linearGradient id={`${title.replace(/\s+/g, "-").toLowerCase()}-fill`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#4a7dff" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#4a7dff" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id={`${title.replace(/\s+/g, "-").toLowerCase()}-line`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#2f5ef4" />
            <stop offset="100%" stopColor="#6ea2ff" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((ratio) => {
          const y = 42 + (totalChart.height - 42 - 56) * ratio;
          return (
            <line
              key={ratio}
              x1={totalChart.width * 0.05}
              y1={y}
              x2={totalChart.width * 0.95}
              y2={y}
              className="revenue-trend-grid"
            />
          );
        })}

        <path
          d={totalChart.areaPath}
          fill={`url(#${title.replace(/\s+/g, "-").toLowerCase()}-fill)`}
          className="revenue-trend-area"
        />
        <path d={totalChart.path} className="revenue-trend-line" stroke={`url(#${title.replace(/\s+/g, "-").toLowerCase()}-line)`} />

        {totalChart.points.map((point, index) => (
          <g key={point.label}>
            <rect
              x={point.x - (totalChart.compact ? totalChart.width * 0.038 : totalChart.width * 0.045)}
              y={point.y - (index % 2 === 0 ? totalChart.height * 0.12 : totalChart.height * 0.17)}
              width={totalChart.compact ? totalChart.width * 0.076 : totalChart.width * 0.09}
              height={totalChart.compact ? totalChart.height * 0.07 : totalChart.height * 0.078}
              rx="11"
              className="revenue-total-pill"
            />
            <text
              x={point.x}
              y={point.y - (index % 2 === 0 ? totalChart.height * 0.075 : totalChart.height * 0.125)}
              textAnchor="middle"
              className={`revenue-total-label ${totalChart.compact ? "compact" : ""}`}
            >
              {formatCompactRevenue(point.total)}
            </text>
            {index === totalChart.points.length - 1 ? (
              <circle cx={point.x} cy={point.y} r="15" className="revenue-point-halo" />
            ) : null}
            <circle cx={point.x} cy={point.y} r={totalChart.compact ? "6" : "7"} className="revenue-point" />
            <text
              x={point.x}
              y={totalChart.height - totalChart.height * 0.04}
              textAnchor="middle"
              className={`revenue-axis-label ${totalChart.dense ? "compact" : ""}`}
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );

  return (
    <div className="revenue-chart-card">
      <div className="revenue-chart-header">
        <div>
          <div className="card-subtitle">{subtitle}</div>
          <h3 className="card-title">{title}</h3>
        </div>
        {mode === "total" && totalChart ? (
          <div className="revenue-chart-actions">
            <button
              type="button"
              className="revenue-expand-button"
              onClick={() => setExpanded(true)}
              aria-label={`Expand ${title}`}
            >
              ⤢
            </button>
            <div className="revenue-chart-stats">
              <div className="revenue-chart-stat">
                <span className="revenue-chart-stat-label">Current</span>
                <strong>{formatCompactRevenue(totalChart.lastPoint.total)}</strong>
              </div>
              <div className="revenue-chart-stat">
                <span className="revenue-chart-stat-label">Peak</span>
                <strong>{formatCompactRevenue(totalChart.maxPoint.total)}</strong>
              </div>
              <div className="revenue-chart-stat">
                <span className="revenue-chart-stat-label">Low</span>
                <strong>{formatCompactRevenue(totalChart.minPoint.total)}</strong>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {mode === "total" && totalChart ? (
        renderTotalChart()
      ) : null}

      {mode === "scopes" ? (
        <div className="revenue-donut-layout">
          <div ref={donutChartRef} className="revenue-donut-wrap">
            <svg viewBox="0 0 360 360" className="revenue-donut-chart" role="img" aria-label={title}>
              {pieData?.arcs.map((arc) => (
                <g key={arc.label}>
                  <path d={arc.path} fill={arc.color} className="revenue-donut-slice" />
                  <text x={arc.labelX} y={arc.labelY} textAnchor="middle" className="revenue-donut-label">
                    {`${Math.round(arc.percent)}%`}
                  </text>
                </g>
              ))}
              <circle cx="180" cy="180" r="58" fill="#ffffff" />
              <text x="180" y="170" textAnchor="middle" className="revenue-donut-center-value">
                {formatCompactRevenue(pieData?.total || 0)}
              </text>
              <text x="180" y="194" textAnchor="middle" className="revenue-donut-center-copy">
                Selected range
              </text>
            </svg>
          </div>

          <div className="revenue-donut-legend">
            {(pieData?.arcs || []).map((segment) => (
              <div key={segment.label} className="revenue-donut-legend-row">
                <div className="revenue-donut-legend-main">
                  <span className="revenue-legend-dot" style={{ background: segment.color }} />
                  <span>{segment.label}</span>
                </div>
                <div className="revenue-donut-legend-metrics">
                  <strong>{Math.round(segment.percent)}%</strong>
                  <span>{formatCompactRevenue(segment.value)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {mode !== "total" ? (
        <div className="revenue-chart-legend">
          {legendItems.map((segment) => (
            <div key={segment.label} className="revenue-legend-item">
              <span className="revenue-legend-dot" style={{ background: segment.color }} />
              <span>{segment.label}</span>
            </div>
          ))}
        </div>
      ) : null}

      {expanded && mode === "total" ? (
        <div className="modal-backdrop" onClick={() => setExpanded(false)}>
          <div className="modal revenue-chart-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="card-subtitle">{subtitle}</div>
                <h3>{title}</h3>
              </div>
              <button type="button" className="icon-button" onClick={() => setExpanded(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              {renderTotalChart(true)}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
