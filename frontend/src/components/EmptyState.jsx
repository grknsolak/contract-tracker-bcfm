import React from "react";

export default function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">▢</div>
      <h4>{title}</h4>
      <p className="muted">{description}</p>
      {action}
    </div>
  );
}
