import React from "react";

export default function Topbar({ onNavigate }) {
  return (
    <header className="topbar">
      <div>
        <div className="page-title">Contract Management</div>
        <div className="page-subtitle">Monitor lifecycles, renewals, and expirations</div>
      </div>
      <div className="topbar-actions">
        <div className="search-field">
          <span className="search-icon">⌕</span>
          <input placeholder="Search customers, contracts, or owners" aria-label="Search" />
        </div>
        <button className="icon-button" aria-label="Notifications">
          <span>●</span>
        </button>
        <button className="btn btn-primary" onClick={() => onNavigate("/customers")}>New Contract</button>
      </div>
    </header>
  );
}
