import React, { useEffect, useRef, useState } from "react";
import { activityLog, ACTIVITY_TYPES } from "../data/activityLog";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTimestamp(ts) {
  const d = new Date(ts);
  return d.toLocaleString("tr-TR", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDateGroup(ts) {
  const d   = new Date(ts);
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return "Bugün";
  if (diff === 1) return "Dün";
  if (diff < 7)  return `${diff} gün önce`;
  if (diff < 14) return "Geçen hafta";
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

function isSameDay(a, b) {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate();
}

// ── Type icon ─────────────────────────────────────────────────────────────────
function TypeIcon({ type }) {
  const cfg = ACTIVITY_TYPES[type] || ACTIVITY_TYPES.system;
  const iconStyle = { color: cfg.color };

  const icons = {
    status_change: (
      <svg style={iconStyle} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
      </svg>
    ),
    contract_added: (
      <svg style={iconStyle} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    ),
    contract_signed: (
      <svg style={iconStyle} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
    renewal: (
      <svg style={iconStyle} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    churn: (
      <svg style={iconStyle} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    tier_change: (
      <svg style={iconStyle} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
        <polyline points="16 7 22 7 22 13"/>
      </svg>
    ),
    user_action: (
      <svg style={iconStyle} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
    value_update: (
      <svg style={iconStyle} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    comment: (
      <svg style={iconStyle} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    system: (
      <svg style={iconStyle} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  };
  return icons[type] || icons.system;
}

// ── Actor avatar ──────────────────────────────────────────────────────────────
function ActorAvatar({ actor, size = 32 }) {
  const isSystem = actor.id === "system";
  return (
    <div
      className="nl-actor-avatar"
      style={{
        width: size, height: size,
        background: isSystem ? "rgba(100,116,139,0.15)" : `${actor.color}22`,
        border: `1.5px solid ${actor.color}55`,
        color: actor.color,
        fontSize: isSystem ? 14 : Math.floor(size * 0.36),
      }}
      title={actor.name}
    >
      {isSystem ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      ) : actor.initials}
    </div>
  );
}

// ── Filter tabs ───────────────────────────────────────────────────────────────
const FILTERS = [
  { key: "all",    label: "Tümü" },
  { key: "status_change",   label: "Durum" },
  { key: "contract_signed", label: "İmza" },
  { key: "renewal",         label: "Yenileme" },
  { key: "churn",           label: "Churn" },
  { key: "tier_change",     label: "Tier" },
  { key: "user_action",     label: "Kullanıcı" },
  { key: "system",          label: "Sistem" },
];

// ── Main component ────────────────────────────────────────────────────────────
export default function NotificationLog({ highlightId }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const highlightRef = useRef(null);

  // Apply filters
  const entries = activityLog.filter((e) => {
    if (filter !== "all" && e.type !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        e.target.toLowerCase().includes(q) ||
        e.actor.name.toLowerCase().includes(q) ||
        e.detail.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Scroll to highlighted item
  useEffect(() => {
    if (highlightId && highlightRef.current) {
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    }
  }, [highlightId]);

  // Build timeline with day separators
  const timeline = [];
  let lastDay = null;
  for (const entry of entries) {
    if (!lastDay || !isSameDay(entry.timestamp, lastDay)) {
      timeline.push({ _separator: true, label: formatDateGroup(entry.timestamp), ts: entry.timestamp });
      lastDay = entry.timestamp;
    }
    timeline.push(entry);
  }

  return (
    <div className="page nl-page">
      {/* Header */}
      <div className="nl-header">
        <div>
          <h1 className="nl-title">Aktivite Günlüğü</h1>
          <p className="nl-subtitle">Tüm sistem olayları, durum değişiklikleri ve kullanıcı işlemleri</p>
        </div>
        <div className="nl-stats">
          <div className="nl-stat">
            <span className="nl-stat-value">{activityLog.length}</span>
            <span className="nl-stat-label">Toplam Olay</span>
          </div>
          <div className="nl-stat">
            <span className="nl-stat-value">
              {activityLog.filter(e => e.timestamp > Date.now() - 86400000).length}
            </span>
            <span className="nl-stat-label">Bugün</span>
          </div>
          <div className="nl-stat">
            <span className="nl-stat-value">
              {new Set(activityLog.map(e => e.actor.id)).size}
            </span>
            <span className="nl-stat-label">Aktör</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="nl-toolbar">
        <div className="nl-filter-tabs">
          {FILTERS.map((f) => {
            const cfg = ACTIVITY_TYPES[f.key];
            const count = f.key === "all"
              ? activityLog.length
              : activityLog.filter(e => e.type === f.key).length;
            return (
              <button
                key={f.key}
                className={`nl-filter-tab${filter === f.key ? " nl-filter-tab--active" : ""}`}
                style={filter === f.key && cfg ? { borderColor: cfg.color, color: cfg.color } : {}}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                <span className="nl-filter-count">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="nl-search-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)", flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="nl-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Müşteri, kullanıcı veya olay ara..."
          />
          {search && (
            <button className="nl-search-clear" onClick={() => setSearch("")}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      {entries.length === 0 ? (
        <div className="nl-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)" }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <p>Sonuç bulunamadı</p>
          <button className="nl-empty-reset" onClick={() => { setFilter("all"); setSearch(""); }}>Filtreleri temizle</button>
        </div>
      ) : (
        <div className="nl-timeline">
          {timeline.map((item, idx) => {
            if (item._separator) {
              return (
                <div key={`sep-${item.ts}`} className="nl-day-separator">
                  <span className="nl-day-label">{item.label}</span>
                </div>
              );
            }

            const cfg = ACTIVITY_TYPES[item.type] || ACTIVITY_TYPES.system;
            const isHighlighted = item.id === highlightId;
            const isLast = idx === timeline.length - 1 || timeline[idx + 1]?._separator;

            return (
              <div
                key={item.id}
                ref={isHighlighted ? highlightRef : null}
                className={`nl-entry${isHighlighted ? " nl-entry--highlighted" : ""}`}
              >
                {/* Timeline line + dot */}
                <div className="nl-connector">
                  <div
                    className="nl-dot"
                    style={{ background: cfg.bg, borderColor: cfg.color + "99" }}
                  >
                    <TypeIcon type={item.type} />
                  </div>
                  {!isLast && <div className="nl-line" />}
                </div>

                {/* Card */}
                <div className="nl-card">
                  {/* Card header */}
                  <div className="nl-card-header">
                    <div className="nl-card-who">
                      <ActorAvatar actor={item.actor} size={28} />
                      <div className="nl-card-who-info">
                        <span className="nl-actor-name">{item.actor.name}</span>
                        <span className="nl-actor-role">{item.actor.role}</span>
                      </div>
                    </div>
                    <div className="nl-card-meta">
                      <span
                        className="nl-type-badge"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                      <span className="nl-timestamp">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        {formatTimestamp(item.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="nl-card-body">
                    <div className="nl-action-line">
                      <span className="nl-action-verb">{item.actor.id === "system" ? "Sistem" : item.actor.name.split(" ")[0]}</span>
                      {" "}{item.action}{" — "}
                      <span className="nl-target">{item.target}</span>
                    </div>
                    <p className="nl-detail">{item.detail}</p>

                    {/* Meta chips: from → to */}
                    {item.meta && (item.meta.from || item.meta.to || item.meta.value) && (
                      <div className="nl-meta-chips">
                        {item.meta.from && (
                          <>
                            <span className="nl-chip nl-chip--from">{item.meta.from}</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)", flexShrink: 0 }}>
                              <line x1="5" y1="12" x2="19" y2="12"/>
                              <polyline points="12 5 19 12 12 19"/>
                            </svg>
                            <span className="nl-chip nl-chip--to">{item.meta.to}</span>
                          </>
                        )}
                        {!item.meta.from && item.meta.value && (
                          <span className="nl-chip nl-chip--value">{item.meta.value}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
