import React, { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, saveSettings } from "../utils/appSettings";
import {
  loadUsers,
  addUser,
  toggleUserEnabled,
  setUserRole,
  deleteUser,
  loadPerms,
  savePerms,
} from "../utils/auth";
import { toastSuccess, toastError } from "../components/Toast";

const ROLES = ["Admin", "Manager", "Viewer"];

const ROLE_META = {
  Admin:   { color: "#C4912A", bg: "rgba(196,145,42,0.12)",   border: "rgba(196,145,42,0.3)"  },
  Manager: { color: "#5AAFDE", bg: "rgba(90,175,222,0.1)",    border: "rgba(90,175,222,0.28)" },
  Viewer:  { color: "#6EE7B7", bg: "rgba(110,231,183,0.1)",   border: "rgba(110,231,183,0.28)" },
};

const SECTIONS = [
  {
    id: "users",
    label: "Users",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    id: "general",
    label: "General",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>,
  },
  {
    id: "teams",
    label: "Teams",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    id: "scopes",
    label: "Service Scopes",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  },
  {
    id: "pipeline",
    label: "Pipeline",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  },
  {
    id: "tiers",
    label: "Customer Tiers",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  },
];

// ── Reusable tag-list editor ─────────────────────────────────────────────────
function TagListEditor({ items, onChange, placeholder = "Add item…", emptyText = "No items yet." }) {
  const [input, setInput] = useState("");

  const add = () => {
    const val = input.trim();
    if (!val || items.includes(val)) return;
    onChange([...items, val]);
    setInput("");
  };

  const remove = (item) => onChange(items.filter((i) => i !== item));

  return (
    <div className="settings-tag-editor">
      <div className="settings-tag-list">
        {items.length === 0
          ? <span className="settings-empty-hint">{emptyText}</span>
          : items.map((item) => (
            <span key={item} className="settings-tag">
              {item}
              <button className="settings-tag-remove" onClick={() => remove(item)} title="Remove">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </span>
          ))
        }
      </div>
      <div className="settings-tag-input-row">
        <input
          className="settings-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button className="btn btn-light settings-tag-add-btn" onClick={add}>Add</button>
      </div>
    </div>
  );
}

// ── Role badge ───────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const m = ROLE_META[role] || ROLE_META.Viewer;
  return (
    <span
      className="um-role-badge"
      style={{ color: m.color, background: m.bg, borderColor: m.border }}
    >
      {role}
    </span>
  );
}

// ── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      className={`um-toggle${checked ? " um-toggle--on" : ""}${disabled ? " um-toggle--disabled" : ""}`}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      type="button"
    >
      <span className="um-toggle-thumb" />
    </button>
  );
}

// ── Users panel ──────────────────────────────────────────────────────────────
const BLANK_FORM = { name: "", email: "", password: "", role: "Viewer" };

function UsersPanel({ currentUser }) {
  const [users, setUsers] = useState(() => loadUsers());
  const [form, setForm] = useState(BLANK_FORM);
  const [formError, setFormError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const isAdmin = currentUser?.role === "Admin";
  const reload = () => setUsers(loadUsers());

  const handleToggle = (id) => {
    if (id === currentUser?.id) return; // can't disable yourself
    toggleUserEnabled(id);
    reload();
    toastSuccess("Kullanıcı durumu güncellendi");
  };

  const handleRoleChange = (id, role) => {
    setUserRole(id, role);
    reload();
    toastSuccess("Yetki güncellendi");
  };

  const handleDelete = (id) => {
    if (id === currentUser?.id) return;
    setDeletingId(id);
  };

  const confirmDelete = () => {
    const ok = deleteUser(deletingId);
    setDeletingId(null);
    if (!ok) {
      toastError("Son Admin kullanıcısı silinemez.");
      return;
    }
    reload();
    toastSuccess("Kullanıcı silindi");
  };

  const handleAdd = (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setFormError("Tüm alanlar zorunludur.");
      return;
    }
    const result = addUser(form);
    if (!result) {
      setFormError("Bu e-posta adresi zaten kayıtlı.");
      return;
    }
    reload();
    setForm(BLANK_FORM);
    setShowForm(false);
    toastSuccess(`${result.name} eklendi`);
  };

  const [perms, setPerms] = useState(() => loadPerms());

  const togglePerm = (actionIdx, role) => {
    if (role === "admin") return; // Admin always has full access
    setPerms((prev) => {
      const next = prev.map((row, i) =>
        i === actionIdx ? { ...row, [role]: !row[role] } : row
      );
      savePerms(next);
      return next;
    });
    toastSuccess("Yetki güncellendi");
  };

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h3>Users &amp; Permissions</h3>
        <p>Sisteme erişebilecek kullanıcıları ve yetkilerini yönetin.</p>
      </div>

      {/* User list */}
      <div className="um-list">
        {users.map((u) => {
          const isSelf = u.id === currentUser?.id;
          return (
            <div key={u.id} className={`um-row${!u.enabled ? " um-row--disabled" : ""}`}>
              {/* Avatar */}
              <div className="um-avatar" style={ROLE_META[u.role]
                ? { background: ROLE_META[u.role].bg, borderColor: ROLE_META[u.role].border, color: ROLE_META[u.role].color }
                : {}}>
                {u.initials || u.name?.slice(0, 2).toUpperCase()}
              </div>

              {/* Identity */}
              <div className="um-identity">
                <span className="um-name">
                  {u.name}
                  {isSelf && <span className="um-self-badge">siz</span>}
                </span>
                <span className="um-email">{u.email}</span>
              </div>

              {/* Role selector */}
              <div className="um-role-wrap">
                {isAdmin && !isSelf ? (
                  <select
                    className="um-role-select"
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                ) : (
                  <RoleBadge role={u.role} />
                )}
              </div>

              {/* Status toggle */}
              <div className="um-status">
                <Toggle
                  checked={u.enabled !== false}
                  onChange={() => handleToggle(u.id)}
                  disabled={!isAdmin || isSelf}
                />
                <span className="um-status-label">
                  {u.enabled !== false ? "Aktif" : "Devre dışı"}
                </span>
              </div>

              {/* Delete */}
              {isAdmin && !isSelf && (
                <button
                  className="um-delete-btn"
                  onClick={() => handleDelete(u.id)}
                  title="Kullanıcıyı sil"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add user */}
      {isAdmin && (
        <div className="um-add-wrap">
          {!showForm ? (
            <button className="um-add-trigger" onClick={() => setShowForm(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Yeni kullanıcı ekle
            </button>
          ) : (
            <form className="um-add-form" onSubmit={handleAdd}>
              <div className="um-add-form-title">Yeni Kullanıcı</div>
              <div className="um-add-grid">
                <div className="settings-group">
                  <label className="settings-label">Ad Soyad</label>
                  <input
                    className="settings-input"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Ahmet Yılmaz"
                    autoFocus
                  />
                </div>
                <div className="settings-group">
                  <label className="settings-label">E-posta</label>
                  <input
                    className="settings-input"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="ahmet@bcfm.com"
                  />
                </div>
                <div className="settings-group">
                  <label className="settings-label">Şifre</label>
                  <input
                    className="settings-input"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
                <div className="settings-group">
                  <label className="settings-label">Yetki</label>
                  <select
                    className="settings-input"
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              {formError && (
                <div className="um-form-error">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {formError}
                </div>
              )}
              <div className="um-add-actions">
                <button type="button" className="btn btn-light" onClick={() => { setShowForm(false); setForm(BLANK_FORM); setFormError(""); }}>
                  İptal
                </button>
                <button type="submit" className="btn btn-primary">Kullanıcı Ekle</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Delete confirm */}
      {deletingId && (
        <div className="um-confirm-overlay" onClick={() => setDeletingId(null)}>
          <div className="um-confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="um-confirm-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div className="um-confirm-text">
              <strong>Kullanıcıyı sil</strong>
              <span>Bu kullanıcı kalıcı olarak silinecek. Bu işlem geri alınamaz.</span>
            </div>
            <div className="um-confirm-actions">
              <button className="btn btn-light" onClick={() => setDeletingId(null)}>İptal</button>
              <button className="btn btn-danger" onClick={confirmDelete}>Sil</button>
            </div>
          </div>
        </div>
      )}

      {/* Permission matrix */}
      <div className="um-perm-section">
        <div className="um-perm-header-row">
          <div className="um-perm-title">Yetki Matrisi</div>
          {isAdmin && (
            <span className="um-perm-hint">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Manager ve Viewer yetkilerini düzenleyebilirsiniz. Admin her zaman tam yetkilidir.
            </span>
          )}
        </div>
        <div className="um-perm-table">
          <div className="um-perm-head">
            <div />
            {ROLES.map((r) => (
              <div key={r} className="um-perm-col-head">
                <RoleBadge role={r} />
                {r === "Admin" && (
                  <svg className="um-perm-lock" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                )}
              </div>
            ))}
          </div>
          {perms.map((row, rowIdx) => (
            <div key={row.action} className="um-perm-row">
              <div className="um-perm-action">{row.action}</div>
              {/* Admin — always locked */}
              <div className="um-perm-cell">
                <CheckIcon />
              </div>
              {/* Manager — editable */}
              <div className="um-perm-cell">
                <button
                  className={`um-perm-toggle${!isAdmin ? " um-perm-toggle--readonly" : ""}`}
                  onClick={() => isAdmin && togglePerm(rowIdx, "manager")}
                  title={isAdmin ? (row.manager ? "Kaldır" : "Ekle") : ""}
                >
                  {row.manager ? <CheckIcon /> : <XIcon />}
                </button>
              </div>
              {/* Viewer — editable */}
              <div className="um-perm-cell">
                <button
                  className={`um-perm-toggle${!isAdmin ? " um-perm-toggle--readonly" : ""}`}
                  onClick={() => isAdmin && togglePerm(rowIdx, "viewer")}
                  title={isAdmin ? (row.viewer ? "Kaldır" : "Ekle") : ""}
                >
                  {row.viewer ? <CheckIcon /> : <XIcon />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22C374" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function XIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

// ── Other section panels ──────────────────────────────────────────────────────
function GeneralPanel({ settings, onChange }) {
  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h3>General</h3>
        <p>Basic information about your organisation.</p>
      </div>
      <div className="settings-group">
        <label className="settings-label">Company name</label>
        <input
          className="settings-input"
          value={settings.companyName}
          onChange={(e) => onChange({ companyName: e.target.value })}
          placeholder="e.g. Acme Corp"
        />
        <span className="settings-hint">Shown in reports and exports.</span>
      </div>
    </div>
  );
}

function TeamsPanel({ settings, onChange }) {
  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h3>Teams</h3>
        <p>Define the sales teams used when assigning contracts.</p>
      </div>
      <div className="settings-group">
        <label className="settings-label">Available teams</label>
        <TagListEditor
          items={settings.teams}
          onChange={(teams) => onChange({ teams })}
          placeholder="New team name…"
          emptyText="No teams defined yet."
        />
        <span className="settings-hint">Changes apply immediately to contract forms.</span>
      </div>
    </div>
  );
}

function ScopesPanel({ settings, onChange }) {
  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h3>Service Scopes</h3>
        <p>Manage the service types that can be assigned to contracts.</p>
      </div>
      <div className="settings-group">
        <label className="settings-label">Scope options</label>
        <TagListEditor
          items={settings.scopes}
          onChange={(scopes) => onChange({ scopes })}
          placeholder="New scope name…"
          emptyText="No scopes defined yet."
        />
        <span className="settings-hint">Removing a scope won't affect existing contracts.</span>
      </div>
    </div>
  );
}

function PipelinePanel({ settings, onChange }) {
  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h3>Pipeline</h3>
        <p>Control when contracts enter the renewal pipeline and trigger alerts.</p>
      </div>
      <div className="settings-group">
        <label className="settings-label">Renewal window</label>
        <div className="settings-input-unit">
          <input
            type="number" min="1" max="365"
            className="settings-input settings-input--sm"
            value={settings.renewalWindowDays}
            onChange={(e) => onChange({ renewalWindowDays: Math.max(1, parseInt(e.target.value) || 1) })}
          />
          <span className="settings-unit">days before expiry</span>
        </div>
        <span className="settings-hint">Contracts expiring within this window appear in the Pipeline page automatically.</span>
      </div>
      <div className="settings-group">
        <label className="settings-label">Churn alert threshold</label>
        <div className="settings-input-unit">
          <input
            type="number" min="1" max="365"
            className="settings-input settings-input--sm"
            value={settings.churnAlertDays}
            onChange={(e) => onChange({ churnAlertDays: Math.max(1, parseInt(e.target.value) || 1) })}
          />
          <span className="settings-unit">days (alert zone)</span>
        </div>
        <span className="settings-hint">Contracts expiring within this window are flagged in Alerts.</span>
      </div>
    </div>
  );
}

function TiersPanel({ settings, onChange }) {
  const { aPlus, a, b } = settings.tierThresholds;
  const update = (key, val) => onChange({ tierThresholds: { ...settings.tierThresholds, [key]: Math.max(0, parseInt(val) || 0) } });

  const tiers = [
    { key: "aPlus", label: "A+", color: "#C4912A", desc: "Top accounts — highest priority" },
    { key: "a",     label: "A",  color: "#8E9BAD", desc: "Strategic accounts" },
    { key: "b",     label: "B",  color: "#6EE7B7", desc: "Growth accounts" },
  ];
  const cVal = { aPlus, a, b };

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h3>Customer Tiers</h3>
        <p>Set the portfolio-share thresholds that determine A+, A, B, and C tier classification.</p>
      </div>
      <div className="settings-tier-grid">
        {tiers.map(({ key, label, color, desc }) => (
          <div key={key} className="settings-tier-row">
            <span className="settings-tier-badge" style={{ color, background: `${color}18`, borderColor: `${color}40` }}>
              {label}
            </span>
            <div className="settings-tier-info">
              <span className="settings-tier-desc">{desc}</span>
            </div>
            <div className="settings-input-unit">
              <span className="settings-unit">≥</span>
              <input
                type="number" min="0" max="100"
                className="settings-input settings-input--sm"
                value={cVal[key]}
                onChange={(e) => update(key, e.target.value)}
              />
              <span className="settings-unit">% of portfolio</span>
            </div>
          </div>
        ))}
        <div className="settings-tier-row settings-tier-row--c">
          <span className="settings-tier-badge" style={{ color: "#93C5FD", background: "rgba(147,197,253,0.1)", borderColor: "rgba(147,197,253,0.35)" }}>C</span>
          <div className="settings-tier-info"><span className="settings-tier-desc">All other accounts</span></div>
          <span className="settings-unit muted">Automatically assigned to remaining accounts</span>
        </div>
      </div>
      <span className="settings-hint" style={{ marginTop: 16, display: "block" }}>Thresholds apply globally across Customers, Pipeline, Segmentation, and Contract Detail pages.</span>
    </div>
  );
}

function AppearancePanel({ theme, toggleTheme }) {
  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h3>Appearance</h3>
        <p>Customise how the interface looks.</p>
      </div>
      <div className="settings-group">
        <label className="settings-label">Theme</label>
        <div className="settings-theme-toggle">
          {["light", "dark"].map((t) => (
            <button
              key={t}
              className={`settings-theme-btn ${theme === t ? "settings-theme-btn--active" : ""}`}
              onClick={() => theme !== t && toggleTheme()}
            >
              {t === "light"
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              }
              {t === "light" ? "Light" : "Dark"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Settings Page ───────────────────────────────────────────────────────
export default function Settings({ settings, onSettingsChange, theme, toggleTheme, currentUser, initialSection }) {
  const [activeSection, setActiveSection] = useState(initialSection || "users");
  const [local, setLocal] = useState({ ...settings });
  const [dirty, setDirty] = useState(false);

  // Sync if initialSection changes (e.g. navigated from profile)
  useEffect(() => {
    if (initialSection) setActiveSection(initialSection);
  }, [initialSection]);

  const update = (patch) => {
    setLocal((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const save = () => {
    saveSettings(local);
    onSettingsChange(local);
    setDirty(false);
    toastSuccess("Settings saved");
  };

  const reset = () => {
    setLocal({ ...settings });
    setDirty(false);
  };

  const renderContent = () => {
    switch (activeSection) {
      case "users":      return <UsersPanel currentUser={currentUser} />;
      case "general":    return <GeneralPanel    settings={local} onChange={update} />;
      case "teams":      return <TeamsPanel      settings={local} onChange={update} />;
      case "scopes":     return <ScopesPanel     settings={local} onChange={update} />;
      case "pipeline":   return <PipelinePanel   settings={local} onChange={update} />;
      case "tiers":      return <TiersPanel      settings={local} onChange={update} />;
      case "appearance": return <AppearancePanel theme={theme} toggleTheme={toggleTheme} />;
      default:           return null;
    }
  };

  const isUserSection = activeSection === "users";

  return (
    <div className="page">
      <div className="details-header">
        <div>
          <div className="breadcrumb">System</div>
          <h2>Settings</h2>
          <p className="muted">Manage users, teams, scopes, pipeline behaviour and appearance.</p>
        </div>
      </div>

      <div className="settings-layout">
        {/* Left nav */}
        <nav className="settings-nav">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              className={`settings-nav-item ${activeSection === s.id ? "settings-nav-item--active" : ""}`}
              onClick={() => setActiveSection(s.id)}
            >
              <span className="settings-nav-icon">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="settings-content">
          {renderContent()}
        </div>
      </div>

      {/* Fixed save bar — bottom-right */}
      {dirty && !isUserSection && (
        <div className="settings-save-bar">
          <button className="btn btn-light" onClick={reset}>Discard</button>
          <button className="btn btn-primary" onClick={save}>Save changes</button>
        </div>
      )}
    </div>
  );
}
