import React from "react";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "◼" },
  { id: "customers", label: "Customers", icon: "◻" },
  { id: "pipelines", label: "Pipelines", icon: "▣" },
  { id: "revenue", label: "MRR / NRR", icon: "◉" },
  { id: "segmentation", label: "Segmentation", icon: "◈" },
  { id: "alerts", label: "Alerts", icon: "◆" },
];

export default function Sidebar({ route, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">CT</div>
        <div>
          <div className="brand-title">Contract Tracker</div>
          <div className="brand-subtitle">Operations Suite</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${route.name === item.id ? "active" : ""}`}
            onClick={() => onNavigate(`/${item.id}`)}
          >
            <span className="nav-icon" aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
