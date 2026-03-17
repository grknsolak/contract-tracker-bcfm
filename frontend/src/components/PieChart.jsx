import React, { useMemo } from "react";
import { pie as d3Pie, arc as d3Arc } from "d3-shape";

export default function PieChart({ data = [], size = 220, innerRadius = 60 }) {
  const radius = size / 2;

  const arcs = useMemo(() => {
    const pie = d3Pie()
      .sort(null)
      .value((d) => d.value);
    return pie(data);
  }, [data]);

  const arcGen = useMemo(() => d3Arc().innerRadius(innerRadius).outerRadius(radius - 8), [innerRadius, radius]);

  return (
    <svg width={size} height={size} className="pie-chart">
      <g transform={`translate(${radius}, ${radius})`}>
        {arcs.map((arc, idx) => (
          <path key={`${arc.data.label}-${idx}`} d={arcGen(arc)} fill={arc.data.color} />
        ))}
      </g>
    </svg>
  );
}
