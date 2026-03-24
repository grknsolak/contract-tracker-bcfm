import React, { useMemo, useState } from "react";
import { loadSettings } from "../utils/appSettings";
import { formatCurrency } from "../utils/date";

// ── helpers ──────────────────────────────────────────────────────────────────
function fmtVal(v) {
  if (!v) return "$0";
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

const STATUS_COLOR = {
  Active:           "#10b981",
  Signed:           "#3b82f6",
  "Renewal Upcoming": "#f59e0b",
  "Approval Pending": "#8b5cf6",
  "Under Review":   "#60a5fa",
  Expired:          "#ef4444",
  NDA:              "#64748b",
  Draft:            "#64748b",
  "Legal Review":   "#60a5fa",
};

function statusDot(stage) {
  const color = STATUS_COLOR[stage] || "#6b7280";
  return (
    <span
      style={{
        display: "inline-block",
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
        marginRight: 5,
      }}
    />
  );
}

// ── SubComponents ─────────────────────────────────────────────────────────────

function CustomerLeaf({ contract, onNavigate }) {
  return (
    <div className="tribe-leaf" onClick={() => onNavigate && onNavigate(`/contracts/${contract.id}`)}>
      <div className="tribe-leaf-name">{contract.customerName}</div>
      <div className="tribe-leaf-meta">
        <span style={{ display: "flex", alignItems: "center" }}>
          {statusDot(contract.stage)}
          {contract.stage}
        </span>
        <span className="tribe-leaf-val">{fmtVal(contract.value)}</span>
      </div>
    </div>
  );
}

function TeamNode({ teamName, customers, onNavigate, tribeColor }) {
  const [collapsed, setCollapsed] = useState(false);
  const totalVal = customers.reduce((s, c) => s + (c.value || 0), 0);
  const activeCount = customers.filter((c) => c.stage === "Active" || c.stage === "Signed").length;

  return (
    <div className="tribe-team-node">
      <div
        className="tribe-team-header"
        onClick={() => setCollapsed((c) => !c)}
        style={{ borderLeftColor: tribeColor }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className={`tribe-chevron${collapsed ? " tribe-chevron--closed" : ""}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
          <span className="tribe-team-name">{teamName}</span>
          <span className="tribe-count-badge">{customers.length}</span>
        </div>
        <div className="tribe-team-stats">
          <span className="tribe-stat-chip tribe-stat-active">{activeCount} active</span>
          <span className="tribe-stat-chip">{fmtVal(totalVal)}</span>
        </div>
      </div>
      {!collapsed && (
        <div className="tribe-team-body">
          {customers.length === 0 ? (
            <div className="tribe-empty-team">No customers assigned</div>
          ) : (
            customers.map((c) => (
              <CustomerLeaf key={c.id} contract={c} onNavigate={onNavigate} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function TribeNode({ tribe, teams, contracts, onNavigate }) {
  const [collapsed, setCollapsed] = useState(false);

  const tribeContracts = contracts.filter((c) => c.tribe === tribe.id);
  const totalVal = tribeContracts.reduce((s, c) => s + (c.value || 0), 0);
  const customerCount = tribeContracts.length;
  const activeCount = tribeContracts.filter((c) => c.stage === "Active" || c.stage === "Signed").length;

  return (
    <div className="tribe-node" style={{ "--tribe-color": tribe.color }}>
      <div className="tribe-node-header" onClick={() => setCollapsed((c) => !c)}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="tribe-node-dot" style={{ background: tribe.color }} />
          <span
            className={`tribe-chevron tribe-chevron--lg${collapsed ? " tribe-chevron--closed" : ""}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
          <span className="tribe-node-title">{tribe.name}</span>
          <span className="tribe-count-badge tribe-count-badge--lg">{teams.length} teams</span>
        </div>
        <div className="tribe-node-stats">
          <span className="tribe-stat-pill" style={{ background: `${tribe.color}22`, color: tribe.color, border: `1px solid ${tribe.color}44` }}>
            {customerCount} customers
          </span>
          <span className="tribe-stat-pill tribe-stat-pill--active">
            {activeCount} active
          </span>
          <span className="tribe-stat-pill tribe-stat-pill--val">
            {fmtVal(totalVal)}
          </span>
        </div>
      </div>
      {!collapsed && (
        <div className="tribe-node-body">
          {teams.map((teamName) => {
            const teamCustomers = contracts.filter(
              (c) => c.tribe === tribe.id && c.team === teamName
            );
            return (
              <TeamNode
                key={teamName}
                teamName={teamName}
                customers={teamCustomers}
                onNavigate={onNavigate}
                tribeColor={tribe.color}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Tribes({ contracts = [], onNavigate }) {
  const settings = useMemo(() => loadSettings(), []);
  const tribes = settings.tribes || [];
  const companyName = settings.companyName || "Company";

  const [allCollapsed, setAllCollapsed] = useState(false);
  const [search, setSearch] = useState("");

  const totalVal = contracts.reduce((s, c) => s + (c.value || 0), 0);
  const totalActive = contracts.filter((c) => c.stage === "Active" || c.stage === "Signed").length;

  // Filter contracts by search
  const filteredContracts = useMemo(() => {
    if (!search.trim()) return contracts;
    const q = search.toLowerCase();
    return contracts.filter(
      (c) =>
        c.customerName.toLowerCase().includes(q) ||
        (c.team || "").toLowerCase().includes(q) ||
        (c.tribe || "").toLowerCase().includes(q)
    );
  }, [contracts, search]);

  // Contracts with no tribe assigned
  const unassignedContracts = filteredContracts.filter((c) => !c.tribe || !tribes.find((t) => t.id === c.tribe));

  return (
    <div className="tribes-page">
      {/* Page header */}
      <div className="tribes-page-header">
        <div>
          <h1 className="tribes-title">Tribe Structure</h1>
          <p className="tribes-subtitle">
            {companyName} &mdash; Organization tree by tribe, team, and customer
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div className="topbar-search" style={{ minWidth: 220 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              placeholder="Search customers, teams..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            className="btn btn-ghost"
            onClick={() => setAllCollapsed((c) => !c)}
            style={{ fontSize: 13, gap: 6, display: "flex", alignItems: "center" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {allCollapsed
                ? <><polyline points="17 11 12 6 7 11" /><polyline points="17 18 12 13 7 18" /></>
                : <><polyline points="7 13 12 18 17 13" /><polyline points="7 6 12 11 17 6" /></>
              }
            </svg>
            {allCollapsed ? "Expand all" : "Collapse all"}
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="tribes-kpi-strip">
        <div className="tribes-kpi-card">
          <div className="tribes-kpi-val">{tribes.length}</div>
          <div className="tribes-kpi-label">Tribes</div>
        </div>
        <div className="tribes-kpi-card">
          <div className="tribes-kpi-val">{(settings.teams || []).length}</div>
          <div className="tribes-kpi-label">Teams</div>
        </div>
        <div className="tribes-kpi-card">
          <div className="tribes-kpi-val">{contracts.length}</div>
          <div className="tribes-kpi-label">Customers</div>
        </div>
        <div className="tribes-kpi-card">
          <div className="tribes-kpi-val" style={{ color: "#10b981" }}>{totalActive}</div>
          <div className="tribes-kpi-label">Active</div>
        </div>
        <div className="tribes-kpi-card">
          <div className="tribes-kpi-val" style={{ color: "#3b82f6" }}>{fmtVal(totalVal)}</div>
          <div className="tribes-kpi-label">Total Value</div>
        </div>
      </div>

      {/* Tree */}
      <div className="tribes-tree">
        {/* Company root */}
        <div className="tribes-root-node">
          <div className="tribes-root-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <span className="tribes-root-name">{companyName}</span>
          <span className="tribes-count-badge tribes-count-badge--root">{contracts.length} contracts</span>
          <span className="tribes-stat-val">{fmtVal(totalVal)}</span>
        </div>

        <div className="tribes-root-children">
          {tribes.map((tribe) => (
            <TribeNode
              key={tribe.id}
              tribe={tribe}
              teams={tribe.teams || []}
              contracts={filteredContracts}
              onNavigate={onNavigate}
            />
          ))}

          {unassignedContracts.length > 0 && (
            <div className="tribe-node tribe-node--unassigned">
              <div className="tribe-node-header" style={{ cursor: "default" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="tribe-node-dot" style={{ background: "#6b7280" }} />
                  <span className="tribe-node-title" style={{ color: "var(--text-muted)" }}>Unassigned</span>
                  <span className="tribe-count-badge">{unassignedContracts.length}</span>
                </div>
              </div>
              <div className="tribe-node-body">
                <div className="tribe-team-node">
                  <div className="tribe-team-body">
                    {unassignedContracts.map((c) => (
                      <CustomerLeaf key={c.id} contract={c} onNavigate={onNavigate} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
