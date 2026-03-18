import React, { useMemo } from "react";
import { pie as d3Pie, arc as d3Arc } from "d3-shape";

export default function PieChart({
  data = [],
  size = 220,
  innerRadius = 60,
  centerLabel = "",
  centerValue = "",
  showPercentages = false,
}) {
  const radius = size / 2;
  const total = useMemo(() => data.reduce((sum, item) => sum + (item.value || 0), 0), [data]);

  const arcs = useMemo(() => {
    const pie = d3Pie()
      .sort(null)
      .value((d) => d.value);
    return pie(data);
  }, [data]);

  const arcGen = useMemo(() => d3Arc().innerRadius(innerRadius).outerRadius(radius - 8), [innerRadius, radius]);
  const labelArcGen = useMemo(
    () => d3Arc().innerRadius(radius + 6).outerRadius(radius + 6),
    [radius]
  );

  return (
    <svg width={size} height={size} className="pie-chart">
      <g transform={`translate(${radius}, ${radius})`}>
        <circle r={radius - 8} fill="none" stroke="#eef2f7" strokeWidth="10" />
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
                  fontSize="11"
                  fontWeight="700"
                >
                  {percentage}%
                </text>
              ) : null}
            </g>
          );
        })}
        <circle r={innerRadius - 6} fill="#ffffff" />
        <text
          x="0"
          y={centerLabel ? -6 : 4}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#1f2937"
          fontSize="30"
          fontWeight="700"
        >
          {centerValue || total}
        </text>
        {centerLabel ? (
          <text
            x="0"
            y="18"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#7a8599"
            fontSize="12"
            fontWeight="600"
          >
            {centerLabel}
          </text>
        ) : null}
      </g>
    </svg>
  );
}
