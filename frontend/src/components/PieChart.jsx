import React, { useMemo } from "react";
import { pie as d3Pie, arc as d3Arc } from "d3-shape";

export default function PieChart({
  data = [],
  size = 200,
  innerRadius = 48,
  centerLabel = "",
  centerValue = "",
  showPercentages = false,
}) {
  const viewportPadding = 18;
  const radius = size / 2;
  const total = useMemo(() => data.reduce((sum, item) => sum + (item.value || 0), 0), [data]);

  const arcs = useMemo(() => {
    const pie = d3Pie()
      .sort(null)
      .value((d) => d.value);
    return pie(data);
  }, [data]);

  const arcGen = useMemo(() => d3Arc().innerRadius(innerRadius).outerRadius(radius - 10), [innerRadius, radius]);
  const labelArcGen = useMemo(
    () => d3Arc().innerRadius(radius + 1).outerRadius(radius + 1),
    [radius]
  );

  return (
    <svg
      className="pie-chart"
      viewBox={`${-viewportPadding} ${-viewportPadding} ${size + viewportPadding * 2} ${size + viewportPadding * 2}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <g transform={`translate(${radius}, ${radius})`}>
        <circle r={radius - 10} fill="none" stroke="#eef2f7" strokeWidth="8" />
        {arcs.map((arc, idx) => {
          const percentage = total ? Math.round(((arc.data.value || 0) / total) * 100) : 0;
          const [labelX, labelY] = labelArcGen.centroid(arc);
          return (
            <g key={`${arc.data.label}-${idx}`}>
              <path d={arcGen(arc)} fill={arc.data.color} stroke="#ffffff" strokeWidth="3" strokeLinejoin="round" />
              {showPercentages && percentage > 0 ? (
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#52627a"
                  fontSize="10"
                  fontWeight="700"
                >
                  {percentage}%
                </text>
              ) : null}
            </g>
          );
        })}
        <circle r={innerRadius - 5} fill="#ffffff" />
        <text
          x="0"
          y={centerLabel ? -6 : 4}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#1f2937"
          fontSize="26"
          fontWeight="800"
        >
          {centerValue || total}
        </text>
        {centerLabel ? (
          <text
            x="0"
            y="16"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#7a8599"
            fontSize="11"
            fontWeight="600"
          >
            {centerLabel}
          </text>
        ) : null}
      </g>
    </svg>
  );
}
