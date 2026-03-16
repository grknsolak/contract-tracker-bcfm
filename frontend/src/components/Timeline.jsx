import React from "react";

export default function Timeline({ items = [] }) {
  return (
    <div className="timeline">
      {items.map((item, index) => (
        <div key={`${item.date}-${index}`} className="timeline-item">
          <div className="timeline-dot" />
          <div>
            <div className="timeline-label">{item.label}</div>
            <div className="timeline-date">{item.date}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
