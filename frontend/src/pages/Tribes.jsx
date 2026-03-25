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

const STAGE_COLOR = {
  "Active":           "#10b981",
  "Signed":           "#3b82f6",
  "Renewal Upcoming": "#f59e0b",
  "Renewal Protocol": "#f59e0b",
  "Approval Pending": "#8b5cf6",
  "Under Review":     "#60a5fa",
  "Legal Review":     "#60a5fa",
  "Expired":          "#ef4444",
  "NDA":              "#64748b",
  "Draft":            "#64748b",
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconBuilding = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const IconChevron = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const IconPlus = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconX = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconCheck = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

// ── Customer cloud ────────────────────────────────────────────────────────────
function CustomerCloud({ teamName, tribeId, contracts, tribeColor, onNavigate, onRemove, onAdd }) {
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const customers = contracts.filter((c) => c.team === teamName);

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    onAdd(teamName, tribeId, name);
    setNewName(""); setAddOpen(false);
  };

  return (
    <div className="org-customer-cloud org-subtree" style={{ "--tc": tribeColor }}>
      <div className="org-customer-grid">
        {customers.map((c) => (
          <div key={c.id} className="org-cchip-wrap">
            <button
              className="org-cchip"
              onClick={() => onNavigate && onNavigate(`/contracts/${c.id}`)}
              title={`${c.stage} · ${c.currency === "USD" ? "$" : "₺"}${(c.value / 1000).toFixed(0)}K`}
            >
              <span className="org-cchip-dot" style={{ background: STAGE_COLOR[c.stage] || "#6b7280" }}/>
              <span className="org-cchip-name">{c.customerName}</span>
            </button>
            <button className="org-cchip-del" onClick={(e) => { e.stopPropagation(); onRemove(c.id); }} title="Kaldır">
              <IconX size={9}/>
            </button>
          </div>
        ))}

        {addOpen ? (
          <div className="org-cchip-form">
            <input className="org-cchip-input" value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAddOpen(false); setNewName(""); } }}
              placeholder="Müşteri adı..." autoFocus/>
            <button className="org-cchip-confirm" onClick={handleAdd}><IconCheck size={11}/></button>
            <button className="org-cchip-cancel" onClick={() => { setAddOpen(false); setNewName(""); }}><IconX size={11}/></button>
          </div>
        ) : (
          <button className="org-cchip-add-btn" onClick={() => setAddOpen(true)}>
            <IconPlus size={11}/> Müşteri ekle
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Tribes({ contracts = [], setContracts, onNavigate }) {
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
      } catch { /**/ }
    }
    return loadSettings();
  });

  const tribes      = settings.tribes || [];
  const companyName = settings.companyName || "BCFM";

  const persist = (newTribes, newTeams) => {
    const updated = { ...settings, tribes: newTribes, ...(newTeams !== undefined ? { teams: newTeams } : {}) };
    setSettings(updated);
    saveSettings(updated);
  };

  // ── Collapse / expand state ───────────────────────────────────────────────
  const [companyOpen, setCompanyOpen] = useState(false);
  const [openTribes,  setOpenTribes]  = useState(new Set());
  const [openTeams,   setOpenTeams]   = useState(new Set());

  const toggleTribe = (id)   => setOpenTribes(prev  => { const s = new Set(prev);  s.has(id)   ? s.delete(id)   : s.add(id);   return s; });
  const toggleTeam  = (name) => setOpenTeams(prev   => { const s = new Set(prev);  s.has(name) ? s.delete(name) : s.add(name); return s; });

  // ── Tribe CRUD ───────────────────────────────────────────────────────────
  const [addTribeOpen,  setAddTribeOpen]  = useState(false);
  const [newTribeName,  setNewTribeName]  = useState("");
  const [newTribeColor, setNewTribeColor] = useState(PALETTE[4]);

  const submitAddTribe = () => {
    const name = newTribeName.trim();
    if (!name) return;
    persist([...tribes, { id: genId(), name, teams: [], color: newTribeColor }]);
    setNewTribeName(""); setNewTribeColor(PALETTE[4]); setAddTribeOpen(false);
  };
  const deleteTribe = (id) => {
    const tribe = tribes.find((t) => t.id === id);
    persist(tribes.filter((t) => t.id !== id), (settings.teams||[]).filter((t) => !(tribe?.teams||[]).includes(t)));
  };

  // ── Team CRUD ────────────────────────────────────────────────────────────
  const [addTeamFor,  setAddTeamFor]  = useState(null);
  const [newTeamName, setNewTeamName] = useState("");

  const submitAddTeam = (tribeId) => {
    const name = newTeamName.trim();
    if (!name) return;
    persist(tribes.map((t) => t.id === tribeId ? { ...t, teams: [...(t.teams||[]), name] } : t),
            [...new Set([...(settings.teams||[]), name])]);
    setAddTeamFor(null); setNewTeamName("");
  };
  const deleteTeam = (tribeId, teamName) => {
    persist(tribes.map((t) => t.id === tribeId ? { ...t, teams: (t.teams||[]).filter((n) => n !== teamName) } : t),
            (settings.teams||[]).filter((t) => t !== teamName));
  };

  // ── Customer CRUD ────────────────────────────────────────────────────────
  const handleAddCustomer = (teamName, tribeId, customerName) => {
    if (!setContracts) return;
    const tribe = tribes.find((t) => t.id === tribeId);
    const today = new Date().toISOString().slice(0, 10);
    setContracts((prev) => [...prev, {
      id: `ct-${Date.now()}`, customerName,
      contractName: `${customerName} Sözleşmesi`, contractType: "Managed Services",
      owner: "", startDate: today,
      endDate: new Date(Date.now() + 365*24*60*60*1000).toISOString().slice(0,10),
      stage: "Active", renewalStatus: "On Track", value: 0, currency: "TL",
      team: teamName, tribe: tribe?.id || "",
      scopes: [], otherScopeText: "", renewalRates: {},
      actions: [], comments: [], history: [{ date: today, label: "Active" }],
    }]);
  };
  const handleRemoveCustomer = (contractId) => {
    if (!setContracts) return;
    setContracts((prev) => prev.map((c) => c.id === contractId ? { ...c, team: "", tribe: "" } : c));
  };

  const totalTeams     = tribes.reduce((s, t) => s + (t.teams||[]).length, 0);
  const totalCustomers = contracts.filter((c) => c.team && c.tribe).length;

  return (
    <div className="tribes-page">
      <div className="tribes-page-header">
        <div>
          <h1 className="tribes-title">Tribe Structure</h1>
          <p className="tribes-subtitle">
            {tribes.length} tribe &middot; {totalTeams} takım &middot; {totalCustomers} müşteri
          </p>
        </div>
      </div>

      <div className="org-chart-wrap">
        <div className="org-tree">
          <ul>
            <li>

              {/* ══ COMPANY NODE ══ */}
              <div
                className={`org-node org-node--company org-node--expandable${companyOpen ? " org-node--open" : ""}`}
                onClick={() => setCompanyOpen((o) => !o)}
              >
                <div className="org-node-icon-wrap"><IconBuilding/></div>
                <span className="org-node-label">{companyName}</span>
                <span className="org-node-sub" style={{ color: "#3b82f6", fontWeight: 600 }}>
                  {totalCustomers} müşteri
                </span>
                <span className={`org-expand-chevron${companyOpen ? " org-expand-chevron--open" : ""}`}>
                  <IconChevron/>
                </span>
              </div>

              {/* ══ TRIBE LEVEL ══ */}
              {companyOpen && (
                <ul className="org-subtree">
                  {tribes.map((tribe) => {
                    const isTribeOpen    = openTribes.has(tribe.id);
                    const tribeCustomers = contracts.filter((c) => (tribe.teams||[]).includes(c.team)).length;

                    return (
                      <li key={tribe.id}>

                        {/* ── TRIBE NODE ── */}
                        <div
                          className={`org-node org-node--tribe org-node--expandable${isTribeOpen ? " org-node--open" : ""}`}
                          style={{ "--tc": tribe.color, borderTopColor: tribe.color }}
                          onClick={() => toggleTribe(tribe.id)}
                        >
                          <button className="org-node-del" onClick={(e) => { e.stopPropagation(); deleteTribe(tribe.id); }} title="Sil">
                            <IconX/>
                          </button>
                          <div className="org-tribe-avatar" style={{ background: `${tribe.color}22`, color: tribe.color }}>
                            {tribe.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="org-node-label">{tribe.name}</span>
                          <span className="org-node-sub">
                            {(tribe.teams||[]).length} takım
                            {tribeCustomers > 0 && (
                              <> &middot; <span style={{ color: tribe.color, fontWeight: 600 }}>{tribeCustomers}</span> müşteri</>
                            )}
                          </span>
                          <span className={`org-expand-chevron${isTribeOpen ? " org-expand-chevron--open" : ""}`}>
                            <IconChevron/>
                          </span>
                        </div>

                        {/* ── TEAM LEVEL ── */}
                        {isTribeOpen && (
                          <ul className="org-subtree">
                            {(tribe.teams||[]).map((teamName) => {
                              const isTeamOpen = openTeams.has(teamName);
                              const teamCount  = contracts.filter((c) => c.team === teamName).length;

                              return (
                                <li key={teamName}>

                                  {/* ── TEAM NODE ── */}
                                  <div
                                    className={`org-node org-node--team org-node--expandable${isTeamOpen ? " org-node--open" : ""}`}
                                    style={{ borderTopColor: tribe.color }}
                                    onClick={() => toggleTeam(teamName)}
                                  >
                                    <button className="org-node-del org-node-del--sm" onClick={(e) => { e.stopPropagation(); deleteTeam(tribe.id, teamName); }} title="Sil">
                                      <IconX size={10}/>
                                    </button>
                                    <span className="org-node-label">{teamName}</span>
                                    {teamCount > 0 && (
                                      <span className="org-team-count-badge" style={{ background: `${tribe.color}22`, color: tribe.color }}>
                                        {teamCount}
                                      </span>
                                    )}
                                    <span className={`org-expand-chevron${isTeamOpen ? " org-expand-chevron--open" : ""}`}>
                                      <IconChevron/>
                                    </span>
                                  </div>

                                  {/* ── CUSTOMER CLOUD ── */}
                                  {isTeamOpen && (
                                    <CustomerCloud
                                      teamName={teamName}
                                      tribeId={tribe.id}
                                      contracts={contracts}
                                      tribeColor={tribe.color}
                                      onNavigate={onNavigate}
                                      onRemove={handleRemoveCustomer}
                                      onAdd={handleAddCustomer}
                                    />
                                  )}
                                </li>
                              );
                            })}

                            {/* Add team */}
                            <li className="org-li--add">
                              {addTeamFor === tribe.id ? (
                                <div className="org-node org-node--input">
                                  <input className="org-input" value={newTeamName}
                                    onChange={(e) => setNewTeamName(e.target.value)}
                                    onKeyDown={(e) => { if (e.key==="Enter") submitAddTeam(tribe.id); if (e.key==="Escape") setAddTeamFor(null); }}
                                    placeholder="Takım adı..." autoFocus/>
                                  <div className="org-input-actions">
                                    <button className="org-action-btn org-action-btn--confirm" onClick={() => submitAddTeam(tribe.id)}><IconCheck/></button>
                                    <button className="org-action-btn org-action-btn--cancel" onClick={() => setAddTeamFor(null)}><IconX/></button>
                                  </div>
                                </div>
                              ) : (
                                <button className="org-node org-node--ghost" onClick={(e) => { e.stopPropagation(); setAddTeamFor(tribe.id); setNewTeamName(""); setAddTribeOpen(false); }}>
                                  <IconPlus/><span>Takım ekle</span>
                                </button>
                              )}
                            </li>
                          </ul>
                        )}
                      </li>
                    );
                  })}

                  {/* Add tribe */}
                  <li className="org-li--add">
                    {addTribeOpen ? (
                      <div className="org-node org-node--tribe-form">
                        <input className="org-input" value={newTribeName}
                          onChange={(e) => setNewTribeName(e.target.value)}
                          onKeyDown={(e) => { if (e.key==="Enter") submitAddTribe(); if (e.key==="Escape") setAddTribeOpen(false); }}
                          placeholder="Tribe adı..." autoFocus/>
                        <div className="org-color-palette">
                          {PALETTE.map((c) => (
                            <button key={c} className={`org-color-dot${newTribeColor===c?" org-color-dot--active":""}`}
                              style={{ background: c }} onClick={() => setNewTribeColor(c)}/>
                          ))}
                        </div>
                        <div className="org-input-actions">
                          <button className="org-action-btn org-action-btn--confirm" onClick={submitAddTribe}><IconCheck/></button>
                          <button className="org-action-btn org-action-btn--cancel" onClick={() => setAddTribeOpen(false)}><IconX/></button>
                        </div>
                      </div>
                    ) : (
                      <button className="org-node org-node--ghost org-node--ghost-tribe"
                        onClick={() => { setAddTribeOpen(true); setNewTribeName(""); setAddTeamFor(null); }}>
                        <IconPlus size={14}/><span>Tribe ekle</span>
                      </button>
                    )}
                  </li>
                </ul>
              )}

            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
