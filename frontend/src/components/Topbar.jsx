import React, { useEffect, useMemo, useRef, useState } from "react";
import Badge from "./Badge";
import { daysUntil } from "../utils/date";
import { getStageMeta, normalizeStage } from "../utils/status";

const PAGE_META = {
  dashboard:    { title: "Dashboard",      subtitle: "Portfolio overview and contract health" },
  customers:    { title: "Customers",      subtitle: "Manage contracts and customer lifecycles" },
  pipelines:    { title: "Pipelines",      subtitle: "Track contracts entering renewal window" },
  revenue:      { title: "Revenue",        subtitle: "MRR / NRR analytics and financial metrics" },
  segmentation: { title: "Segmentation",   subtitle: "Top customers ranked by revenue scope" },
  alerts:       { title: "Alerts",         subtitle: "Expiring contracts and churn risks" },
  contracts:    { title: "Contract",       subtitle: "Full contract details and activity" },
};

export default function Topbar({ onNavigate, contracts = [], route = {} }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const alertCount = useMemo(() => {
    return contracts.filter((c) => {
      const days = daysUntil(c.endDate);
      return typeof days === "number" && days >= 0 && days <= 30;
    }).length;
  }, [contracts]);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    return contracts
      .filter((contract) =>
        [
          contract.customerName,
          contract.contractName,
          contract.owner,
          contract.team,
          ...(contract.scopes || []),
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalized))
      )
      .slice(0, 6);
  }, [contracts, query]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const submitSearch = () => {
    const normalized = query.trim();
    if (!normalized) return;
    setIsOpen(false);
    onNavigate(`/customers?q=${encodeURIComponent(normalized)}`);
  };

  const meta = PAGE_META[route.name] || PAGE_META.dashboard;

  return (
    <header className="topbar">
      <div>
        <div className="page-title">{meta.title}</div>
        <div className="page-subtitle">{meta.subtitle}</div>
      </div>
      <div className="topbar-actions">
        <div className="search-shell" ref={wrapperRef}>
          <div className="search-field">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setIsOpen(true);
              }}
              onFocus={() => {
                if (query.trim()) setIsOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitSearch();
                if (event.key === "Escape") setIsOpen(false);
              }}
              placeholder="Search customers, contracts, or owners"
              aria-label="Search"
            />
            {query && (
              <button
                className="search-clear"
                onClick={() => { setQuery(""); setIsOpen(false); }}
                aria-label="Clear search"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
          {isOpen && query.trim() && (
            <div className="search-results">
              {results.length > 0 ? (
                <>
                  {results.map((contract) => {
                    const meta = getStageMeta(contract.stage);
                    return (
                      <button
                        key={contract.id}
                        className="search-result-item"
                        onClick={() => {
                          setIsOpen(false);
                          setQuery("");
                          onNavigate(`/contracts/${contract.id}`);
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <span className="search-result-title">{contract.customerName}</span>
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                        </div>
                        <span className="search-result-meta">
                          {contract.contractName} · {contract.owner} · {contract.team || "No team"}
                        </span>
                      </button>
                    );
                  })}
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
        <button className="topbar-icon-btn" aria-label="Notifications" onClick={() => onNavigate("/alerts")}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {alertCount > 0 && <span className="topbar-badge">{alertCount}</span>}
        </button>
        <button className="btn btn-primary btn-with-icon" onClick={() => onNavigate("/customers")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Contract
        </button>
      </div>
    </header>
  );
}
