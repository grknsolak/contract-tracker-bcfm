import React, { useEffect, useMemo, useRef, useState } from "react";

export default function Topbar({ onNavigate, contracts = [] }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

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

  return (
    <header className="topbar">
      <div>
        <div className="page-title">Contract Management</div>
        <div className="page-subtitle">Monitor lifecycles, renewals, and expirations</div>
      </div>
      <div className="topbar-actions">
        <div className="search-shell" ref={wrapperRef}>
        <div className="search-field">
          <span className="search-icon">⌕</span>
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
              if (event.key === "Enter") {
                submitSearch();
              }
            }}
            placeholder="Search customers, contracts, or owners"
            aria-label="Search"
          />
        </div>
          {isOpen && query.trim() && (
            <div className="search-results">
              {results.length > 0 ? (
                <>
                  {results.map((contract) => (
                    <button
                      key={contract.id}
                      className="search-result-item"
                      onClick={() => {
                        setIsOpen(false);
                        setQuery(contract.customerName);
                        onNavigate(`/contracts/${contract.id}`);
                      }}
                    >
                      <span className="search-result-title">{contract.customerName}</span>
                      <span className="search-result-meta">
                        {contract.contractName} · {contract.owner}
                      </span>
                    </button>
                  ))}
                  <button className="search-result-item search-result-view-all" onClick={submitSearch}>
                    <span className="search-result-title">View all matches</span>
                    <span className="search-result-meta">Open filtered customer list</span>
                  </button>
                </>
              ) : (
                <button className="search-result-item search-result-view-all" onClick={submitSearch}>
                  <span className="search-result-title">Search for “{query.trim()}”</span>
                  <span className="search-result-meta">Open filtered customer list</span>
                </button>
              )}
            </div>
          )}
        </div>
        <button className="icon-button" aria-label="Notifications">
          <span>●</span>
        </button>
        <button className="btn btn-primary" onClick={() => onNavigate("/customers")}>New Contract</button>
      </div>
    </header>
  );
}
