import React from "react";

export default function BarChart({ data = [], max = 1 }) {
  return (
    <div className="bar-chart">
      {data.map((item) => {
        const width = max ? Math.round((item.value / max) * 100) : 0;
        return (
          <div key={item.label} className="bar-row">
            <div className="bar-label">{item.label}</div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${width}%` }} />
            </div>
            <div className="bar-value">{item.value}</div>
          </div>
        );
      })}
    </div>
  );
}
