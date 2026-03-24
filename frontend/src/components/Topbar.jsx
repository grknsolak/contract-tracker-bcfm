import React, { useEffect, useMemo, useRef, useState } from "react";
import Badge from "./Badge";
import { daysUntil } from "../utils/date";
import { getStageMeta } from "../utils/status";

const PAGE_META = {
  dashboard:    { title: "Dashboard",      subtitle: "Portfolio overview and contract health" },
  customers:    { title: "Customers",      subtitle: "Manage contracts and customer lifecycles" },
  pipelines:    { title: "Pipelines",      subtitle: "Track contracts entering renewal window" },
  revenue:      { title: "Revenue",        subtitle: "MRR / NRR analytics and financial metrics" },
  segmentation: { title: "Segmentation",   subtitle: "Top customers ranked by revenue scope" },
  alerts:       { title: "Alerts",         subtitle: "Expiring contracts and churn risks" },
  contracts:    { title: "Contract",       subtitle: "Full contract details and activity" },
};

// ── Notification helpers ───────────────────────────────────────────────────────
function timeAgo(date) {
  const secs = Math.floor((Date.now() - date) / 1000);
  if (secs < 60)  return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

const NOTIF_TYPES = {
  status:   { color: "var(--primary-light)", bg: "rgba(196,145,42,0.12)" },
  renewal:  { color: "var(--warning)",       bg: "rgba(245,158,11,0.12)" },
  signed:   { color: "var(--success)",       bg: "rgba(34,195,116,0.12)" },
  churn:    { color: "var(--danger-light)",  bg: "rgba(232,64,64,0.12)"  },
  tier:     { color: "#93C5FD",              bg: "rgba(147,197,253,0.10)" },
  new:      { color: "var(--text-secondary)",bg: "rgba(255,255,255,0.06)" },
};

function NotifIcon({ type }) {
  const style = { color: NOTIF_TYPES[type]?.color || "var(--muted)" };
  if (type === "status") return (
    <svg style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  );
  if (type === "renewal") return (
    <svg style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
  if (type === "signed") return (
    <svg style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
  if (type === "churn") return (
    <svg style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
  if (type === "tier") return (
    <svg style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
      <polyline points="16 7 22 7 22 13"/>
    </svg>
  );
  return (
    <svg style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

// Seed pool — drawn from randomly to simulate live events
const NOTIF_POOL = [
  { type: "status",  title: "Sözleşme durumu güncellendi",    body: "Harbor Health · Draft → Legal Review" },
  { type: "renewal", title: "Yenileme tarihi yaklaşıyor",     body: "Summit Airlines · 14 gün kaldı" },
  { type: "signed",  title: "Sözleşme imzalandı",            body: "Atlas Manufacturing · Aktif hale geldi" },
  { type: "churn",   title: "Churn riski tespit edildi",      body: "Brightline Media · 6 ay hareketsiz" },
  { type: "tier",    title: "Müşteri tier'ı değişti",         body: "Pioneer Energy · B → A seviyesine yükseldi" },
  { type: "status",  title: "Pipeline aşaması değişti",       body: "Cobalt Analytics · Signature aşamasına geçti" },
  { type: "renewal", title: "Otomatik yenileme tetiklendi",   body: "Aurora Retail Group · 30 günlük pencere açıldı" },
  { type: "signed",  title: "Yeni sözleşme oluşturuldu",     body: "Northwind Logistics · Enterprise Support" },
  { type: "churn",   title: "Ödeme gecikmesi",                body: "Evergreen Finance · 15 gün gecikme" },
  { type: "tier",    title: "Gelir hedefi aşıldı",            body: "Crescent Public Sector · A+ seviyesine çıktı" },
  { type: "status",  title: "Sözleşme yenileme protokolü",   body: "Harbor Health · Renewal Protocol başlatıldı" },
  { type: "new",     title: "Yeni müşteri eklendi",           body: "Nexus Digital · Onboarding başladı" },
  { type: "status",  title: "ZAM oranı güncellendi",          body: "Summit Airlines · %8 → %12 artış onaylandı" },
  { type: "renewal", title: "SLA süresi doluyor",             body: "Cobalt Analytics · 7 gün içinde yenilenecek" },
  { type: "signed",  title: "Ek hizmet sözleşmesi imzalandı","body": "Aurora Retail Group · DaaS T&M eklendi" },
];

function buildSeedNotifs() {
  const now = Date.now();
  return [
    { id: "n1", ...NOTIF_POOL[0], time: now - 2 * 60 * 1000,   read: false },
    { id: "n2", ...NOTIF_POOL[1], time: now - 8 * 60 * 1000,   read: false },
    { id: "n3", ...NOTIF_POOL[2], time: now - 23 * 60 * 1000,  read: false },
    { id: "n4", ...NOTIF_POOL[3], time: now - 1.5 * 3600000,   read: true  },
    { id: "n5", ...NOTIF_POOL[4], time: now - 3 * 3600000,     read: true  },
    { id: "n6", ...NOTIF_POOL[5], time: now - 5 * 3600000,     read: true  },
  ];
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function Topbar({ onNavigate, contracts = [], route = {}, theme = "dark", toggleTheme, onNotifNavigate }) {
  // Search
  const [query, setQuery]       = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);

  // Notifications
  const [notifs, setNotifs]         = useState(buildSeedNotifs);
  const [notifOpen, setNotifOpen]   = useState(false);
  const notifRef = useRef(null);
  const poolIdx  = useRef(6); // next index to draw from NOTIF_POOL

  const unreadCount = notifs.filter((n) => !n.read).length;

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
      if (notifRef.current  && !notifRef.current.contains(e.target))  setNotifOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Simulate live notifications every ~22 seconds
  useEffect(() => {
    const id = setInterval(() => {
      const idx = poolIdx.current % NOTIF_POOL.length;
      poolIdx.current += 1;
      const item = NOTIF_POOL[idx];
      setNotifs((prev) => [
        { id: `n-${Date.now()}`, ...item, time: Date.now(), read: false },
        ...prev.slice(0, 19), // keep max 20
      ]);
    }, 22000);
    return () => clearInterval(id);
  }, []);

  // Force re-render every minute so "time ago" labels stay fresh
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const markRead  = (nid) => setNotifs((p) => p.map((n) => n.id === nid ? { ...n, read: true } : n));
  const markAllRead = () => setNotifs((p) => p.map((n) => ({ ...n, read: true })));
  const dismiss   = (nid, e) => { e.stopPropagation(); setNotifs((p) => p.filter((n) => n.id !== nid)); };

  // Search results
  const alertCount = useMemo(() =>
    contracts.filter((c) => { const d = daysUntil(c.endDate); return typeof d === "number" && d >= 0 && d <= 30; }).length,
  [contracts]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return contracts.filter((c) =>
      [c.customerName, c.contractName, c.owner, c.team, ...(c.scopes || [])]
        .filter(Boolean).some((v) => v.toLowerCase().includes(q))
    ).slice(0, 6);
  }, [contracts, query]);

  const submitSearch = () => {
    const q = query.trim();
    if (!q) return;
    setSearchOpen(false);
    onNavigate(`/customers?q=${encodeURIComponent(q)}`);
  };

  const meta = PAGE_META[route.name] || PAGE_META.dashboard;

  return (
    <header className="topbar">
      <div>
        <div className="page-title">{meta.title}</div>
        <div className="page-subtitle">{meta.subtitle}</div>
      </div>

      <div className="topbar-actions">
        {/* Search */}
        <div className="search-shell" ref={searchRef}>
          <div className="search-field">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => { if (query.trim()) setSearchOpen(true); }}
              onKeyDown={(e) => { if (e.key === "Enter") submitSearch(); if (e.key === "Escape") setSearchOpen(false); }}
              placeholder="Search customers, contracts, or owners"
              aria-label="Search"
            />
            {query && (
              <button className="search-clear" onClick={() => { setQuery(""); setSearchOpen(false); }} aria-label="Clear">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
          {searchOpen && query.trim() && (
            <div className="search-results">
              {results.length > 0 ? (
                <>
                  {results.map((c) => { const m = getStageMeta(c.stage); return (
                    <button key={c.id} className="search-result-item" onClick={() => { setSearchOpen(false); setQuery(""); onNavigate(`/contracts/${c.id}`); }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                        <span className="search-result-title">{c.customerName}</span>
                        <Badge tone={m.tone}>{m.label}</Badge>
                      </div>
                      <span className="search-result-meta">{c.contractName} · {c.owner} · {c.team || "No team"}</span>
                    </button>
                  ); })}
                  <button className="search-result-item search-result-view-all" onClick={submitSearch}>
                    <span className="search-result-title">View all matches</span>
                    <span className="search-result-meta">Open filtered customer list</span>
                  </button>
                </>
              ) : (
                <button className="search-result-item search-result-view-all" onClick={submitSearch}>
                  <span className="search-result-title">Search for "{query.trim()}"</span>
                  <span className="search-result-meta">Open filtered customer list</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button className="topbar-icon-btn theme-toggle" aria-label="Toggle theme" onClick={toggleTheme} title={theme === "dark" ? "Light mode" : "Dark mode"}>
          {theme === "dark" ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>

        {/* Notification bell */}
        <div className="notif-shell" ref={notifRef}>
          <button
            className={`topbar-icon-btn${notifOpen ? " topbar-icon-btn--active" : ""}`}
            aria-label="Notifications"
            onClick={() => setNotifOpen((v) => !v)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && <span className="topbar-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
          </button>

          {notifOpen && (
            <div className="notif-panel">
              {/* Header */}
              <div className="notif-panel-header">
                <span className="notif-panel-title">
                  Bildirimler
                  {unreadCount > 0 && <span className="notif-panel-count">{unreadCount} yeni</span>}
                </span>
                {unreadCount > 0 && (
                  <button className="notif-mark-all" onClick={markAllRead}>
                    Tümünü okundu işaretle
                  </button>
                )}
              </div>

              {/* List */}
              <div className="notif-list">
                {notifs.length === 0 ? (
                  <div className="notif-empty">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)", margin: "0 auto 8px" }}>
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                    <p>Bildirim yok</p>
                  </div>
                ) : (
                  notifs.map((n) => {
                    const cfg = NOTIF_TYPES[n.type] || NOTIF_TYPES.new;
                    return (
                      <div
                        key={n.id}
                        className={`notif-item${n.read ? "" : " notif-item--unread"}`}
                        onClick={() => { markRead(n.id); setNotifOpen(false); onNavigate("/notifications"); }}
                      >
                        <div className="notif-icon-wrap" style={{ background: cfg.bg }}>
                          <NotifIcon type={n.type} />
                        </div>
                        <div className="notif-body">
                          <div className="notif-title">{n.title}</div>
                          <div className="notif-desc">{n.body}</div>
                          <div className="notif-time">{timeAgo(n.time)}</div>
                        </div>
                        {!n.read && <div className="notif-dot" />}
                        <button
                          className="notif-dismiss"
                          onClick={(e) => dismiss(n.id, e)}
                          aria-label="Kapat"
                          title="Kaldır"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              {notifs.length > 0 && (
                <div className="notif-panel-footer">
                  <button className="notif-clear-all" onClick={() => setNotifs([])}>
                    Tüm bildirimleri temizle
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <button className="btn btn-primary btn-with-icon" onClick={() => onNavigate("/customers")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Contract
        </button>
      </div>
    </header>
  );
}
