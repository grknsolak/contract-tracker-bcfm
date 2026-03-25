import React, { useState } from "react";
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from "../utils/appSettings";

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

const PALETTE = [
  "#ef4444", "#f97316", "#f59e0b", "#10b981",
  "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899",
  "#14b8a6", "#84cc16",
];

// Stage → dot color
const STAGE_COLOR = {
  "Active":             "#10b981",
  "Signed":             "#3b82f6",
  "Renewal Upcoming":   "#f59e0b",
  "Renewal Protocol":   "#f59e0b",
  "Approval Pending":   "#8b5cf6",
  "Under Review":       "#60a5fa",
  "Legal Review":       "#60a5fa",
  "Expired":            "#ef4444",
  "NDA":                "#64748b",
  "Draft":              "#64748b",
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconBuilding = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const IconPlus = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconX = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconCheck = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ── Customer cloud beneath a team node ────────────────────────────────────────
function CustomerCloud({ teamName, contracts, tribeColor, onNavigate }) {
  const customers = contracts.filter((c) => c.team === teamName);
  if (customers.length === 0) return null;

  return (
    <div className="org-customer-cloud" style={{ "--tc": tribeColor }}>
      <div className="org-customer-grid">
        {customers.map((c) => {
          const dotColor = STAGE_COLOR[c.stage] || "#6b7280";
          return (
            <button
              key={c.id}
              className="org-customer-chip"
              onClick={() => onNavigate && onNavigate(`/contracts/${c.id}`)}
              title={`${c.stage} · ${c.currency === "USD" ? "$" : "₺"}${(c.value / 1000).toFixed(0)}K`}
            >
              <span
                className="org-customer-dot"
                style={{ background: dotColor }}
              />
              {c.customerName}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Tribes({ contracts = [], onNavigate }) {
  const [settings, setSettings] = useState(() => {
    const raw = localStorage.getItem("appSettings");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.tribes && parsed.tribes.some((t) => ["enterprise","growth","smb"].includes(t.id))) {
          const fresh = { ...DEFAULT_SETTINGS };
          saveSettings(fresh);
          return fresh;
        }
      } catch { /* ignore */ }
    }
    return loadSettings();
  });

  const tribes = settings.tribes || [];
  const companyName = settings.companyName || "BCFM";

  const persist = (newTribes, newTeams) => {
    const updated = {
      ...settings,
      tribes: newTribes,
      ...(newTeams !== undefined ? { teams: newTeams } : {}),
    };
    setSettings(updated);
    saveSettings(updated);
  };

  // ── Add tribe ─────────────────────────────────────────────────────────────
  const [addTribeOpen, setAddTribeOpen] = useState(false);
  const [newTribeName, setNewTribeName]   = useState("");
  const [newTribeColor, setNewTribeColor] = useState(PALETTE[4]);

  const submitAddTribe = () => {
    const name = newTribeName.trim();
    if (!name) return;
    persist([...tribes, { id: genId(), name, teams: [], color: newTribeColor }]);
    setNewTribeName("");
    setNewTribeColor(PALETTE[4]);
    setAddTribeOpen(false);
  };

  // ── Add team ──────────────────────────────────────────────────────────────
  const [addTeamFor, setAddTeamFor]   = useState(null);
  const [newTeamName, setNewTeamName] = useState("");

  const openAddTeam = (tribeId) => {
    setAddTeamFor(tribeId);
    setNewTeamName("");
    setAddTribeOpen(false);
  };

  const submitAddTeam = (tribeId) => {
    const name = newTeamName.trim();
    if (!name) return;
    const newTribes = tribes.map((t) =>
      t.id === tribeId ? { ...t, teams: [...(t.teams || []), name] } : t
    );
    const allTeams = [...new Set([...(settings.teams || []), name])];
    persist(newTribes, allTeams);
    setAddTeamFor(null);
    setNewTeamName("");
  };

  // ── Delete tribe ──────────────────────────────────────────────────────────
  const deleteTribe = (tribeId) => {
    const tribe = tribes.find((t) => t.id === tribeId);
    const removed = tribe?.teams || [];
    const newTribes = tribes.filter((t) => t.id !== tribeId);
    const allTeams  = (settings.teams || []).filter((t) => !removed.includes(t));
    persist(newTribes, allTeams);
  };

  // ── Delete team ───────────────────────────────────────────────────────────
  const deleteTeam = (tribeId, teamName) => {
    const newTribes = tribes.map((t) =>
      t.id === tribeId ? { ...t, teams: (t.teams || []).filter((n) => n !== teamName) } : t
    );
    const allTeams = (settings.teams || []).filter((t) => t !== teamName);
    persist(newTribes, allTeams);
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalTeams     = tribes.reduce((s, t) => s + (t.teams || []).length, 0);
  const totalCustomers = contracts.length;

  return (
    <div className="tribes-page">
      {/* Header */}
      <div className="tribes-page-header">
        <div>
          <h1 className="tribes-title">Tribe Structure</h1>
          <p className="tribes-subtitle">
            {tribes.length} tribe &middot; {totalTeams} takım &middot; {totalCustomers} müşteri
          </p>
        </div>
      </div>

      {/* Org chart */}
      <div className="org-chart-wrap">
        <div className="org-tree">
          <ul>
            <li>
              {/* ── Company node ── */}
              <div className="org-node org-node--company">
                <div className="org-node-icon-wrap">
                  <IconBuilding />
                </div>
                <span className="org-node-label">{companyName}</span>
                <span className="org-node-sub" style={{ color: "#3b82f6", fontWeight: 600 }}>
                  {totalCustomers} müşteri
                </span>
              </div>

              {/* ── Tribe level ── */}
              <ul>
                {tribes.map((tribe) => {
                  const tribeCustomerCount = contracts.filter((c) =>
                    (tribe.teams || []).includes(c.team)
                  ).length;

                  return (
                    <li key={tribe.id}>
                      {/* Tribe node */}
                      <div
                        className="org-node org-node--tribe"
                        style={{ "--tc": tribe.color, borderTopColor: tribe.color }}
                      >
                        <button
                          className="org-node-del"
                          onClick={() => deleteTribe(tribe.id)}
                          title="Tribe'ı sil"
                        >
                          <IconX />
                        </button>
                        <div
                          className="org-tribe-avatar"
                          style={{ background: `${tribe.color}22`, color: tribe.color }}
                        >
                          {tribe.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="org-node-label">{tribe.name}</span>
                        <span className="org-node-sub">
                          {(tribe.teams || []).length} takım
                          {tribeCustomerCount > 0 && (
                            <> &middot; <span style={{ color: tribe.color, fontWeight: 600 }}>{tribeCustomerCount}</span> müşteri</>
                          )}
                        </span>
                      </div>

                      {/* ── Team level ── */}
                      <ul>
                        {(tribe.teams || []).map((teamName) => {
                          const teamCount = contracts.filter((c) => c.team === teamName).length;
                          return (
                            <li key={teamName}>
                              <div
                                className="org-node org-node--team"
                                style={{ borderTopColor: tribe.color }}
                              >
                                <button
                                  className="org-node-del org-node-del--sm"
                                  onClick={() => deleteTeam(tribe.id, teamName)}
                                  title="Takımı sil"
                                >
                                  <IconX size={10} />
                                </button>
                                <span className="org-node-label">{teamName}</span>
                                {teamCount > 0 && (
                                  <span
                                    className="org-team-count-badge"
                                    style={{ background: `${tribe.color}22`, color: tribe.color }}
                                  >
                                    {teamCount}
                                  </span>
                                )}
                              </div>

                              {/* ── Customer cloud ── */}
                              <CustomerCloud
                                teamName={teamName}
                                contracts={contracts}
                                tribeColor={tribe.color}
                                onNavigate={onNavigate}
                              />
                            </li>
                          );
                        })}

                        {/* Add team inline */}
                        <li className="org-li--add">
                          {addTeamFor === tribe.id ? (
                            <div className="org-node org-node--input">
                              <input
                                className="org-input"
                                value={newTeamName}
                                onChange={(e) => setNewTeamName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") submitAddTeam(tribe.id);
                                  if (e.key === "Escape") setAddTeamFor(null);
                                }}
                                placeholder="Takım adı..."
                                autoFocus
                              />
                              <div className="org-input-actions">
                                <button
                                  className="org-action-btn org-action-btn--confirm"
                                  onClick={() => submitAddTeam(tribe.id)}
                                >
                                  <IconCheck />
                                </button>
                                <button
                                  className="org-action-btn org-action-btn--cancel"
                                  onClick={() => setAddTeamFor(null)}
                                >
                                  <IconX />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              className="org-node org-node--ghost"
                              onClick={() => openAddTeam(tribe.id)}
                            >
                              <IconPlus />
                              <span>Takım ekle</span>
                            </button>
                          )}
                        </li>
                      </ul>
                    </li>
                  );
                })}

                {/* Add tribe */}
                <li className="org-li--add">
                  {addTribeOpen ? (
                    <div className="org-node org-node--tribe-form">
                      <input
                        className="org-input"
                        value={newTribeName}
                        onChange={(e) => setNewTribeName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitAddTribe();
                          if (e.key === "Escape") setAddTribeOpen(false);
                        }}
                        placeholder="Tribe adı..."
                        autoFocus
                      />
                      <div className="org-color-palette">
                        {PALETTE.map((c) => (
                          <button
                            key={c}
                            className={`org-color-dot${newTribeColor === c ? " org-color-dot--active" : ""}`}
                            style={{ background: c }}
                            onClick={() => setNewTribeColor(c)}
                            title={c}
                          />
                        ))}
                      </div>
                      <div className="org-input-actions">
                        <button
                          className="org-action-btn org-action-btn--confirm"
                          onClick={submitAddTribe}
                        >
                          <IconCheck />
                        </button>
                        <button
                          className="org-action-btn org-action-btn--cancel"
                          onClick={() => setAddTribeOpen(false)}
                        >
                          <IconX />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="org-node org-node--ghost org-node--ghost-tribe"
                      onClick={() => { setAddTribeOpen(true); setNewTribeName(""); setAddTeamFor(null); }}
                    >
                      <IconPlus size={14} />
                      <span>Tribe ekle</span>
                    </button>
                  )}
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
