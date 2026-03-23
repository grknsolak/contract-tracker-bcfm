import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/Card";
import Badge from "../components/Badge";
import EmptyState from "../components/EmptyState";
import { formatCurrency } from "../utils/date";
import { getFxLatest } from "../api";

function normalizeUsdValue(contract, rate) {
  const rawValue = Number(contract.value || 0);
  if (!rawValue) return 0;
  if (contract.currency === "TL") {
    return rate ? rawValue / rate : 0;
  }
  return rawValue;
}

export default function Segmentation({ contracts, onNavigate }) {
  const [fx, setFx] = useState({ rate: null, date: null, loading: true, error: null });
  const [selectedScope, setSelectedScope] = useState("All");

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const { data } = await getFxLatest("USD", "TRY");
        const rate = data?.rates?.TRY;
        if (on) {
          setFx({ rate: typeof rate === "number" ? rate : null, date: data?.date, loading: false, error: null });
        }
      } catch (error) {
        if (on) {
          setFx({ rate: null, date: null, loading: false, error: "FX rate unavailable" });
        }
      }
    })();
    return () => {
      on = false;
    };
  }, []);

  const scopes = useMemo(() => {
    return ["All", ...Array.from(new Set(contracts.flatMap((contract) => contract.scopes || [])))];
  }, [contracts]);

  const filtered = useMemo(() => {
    return contracts
      .filter((contract) => selectedScope === "All" || (contract.scopes || []).includes(selectedScope))
      .map((contract) => ({
        ...contract,
        usdValue: normalizeUsdValue(contract, fx.rate),
      }))
      .sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0))
      .slice(0, 10);
  }, [contracts, selectedScope, fx.rate]);

  const totalValue = useMemo(
    () => filtered.reduce((sum, contract) => sum + (contract.usdValue || 0), 0),
    [filtered]
  );

  const highlightedScopeLabel = selectedScope === "All" ? "All scopes" : selectedScope;

  return (
    <div className="page">
      <div className="details-header">
        <div>
          <div className="breadcrumb">Segmentation / Scope View</div>
          <h2>Top 10 Customers by Scope</h2>
          <p className="muted">Start simple: pick a service scope and see the highest-value customers instantly.</p>
        </div>
        <div className="details-meta">
          {fx.loading ? (
            <Badge tone="neutral">Loading FX rate</Badge>
          ) : fx.error ? (
            <Badge tone="danger">FX rate unavailable</Badge>
          ) : (
            <Badge tone="success">USD/TRY: {fx.rate?.toFixed(2)} ({fx.date})</Badge>
          )}
        </div>
      </div>

      <Card title="Scope filter" subtitle="Choose a scope to rank customers">
        <div className="scope-filter-shell">
          <div className="scope-filter-toolbar">
            <div className="scope-filter-summary">
              <span className="scope-filter-summary-label">Selected scope</span>
              <strong>{highlightedScopeLabel}</strong>
              <span className="scope-filter-summary-meta">
                {filtered.length} customers · {formatCurrency(totalValue, "USD")} total
              </span>
            </div>

            <div className="scope-filter-row">
              {scopes.map((scope) => (
                <button
                  key={scope}
                  className={`scope-filter-chip ${selectedScope === scope ? "active" : ""}`}
                  onClick={() => setSelectedScope(scope)}
                >
                  {scope}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card
        title={selectedScope === "All" ? "Top 10 customers across all scopes" : `Top 10 customers for ${selectedScope}`}
        subtitle={`Ranked by contract value${filtered.length ? ` · ${filtered.length} customers · ${formatCurrency(totalValue, "USD")}` : ""}`}
      >
        {filtered.length === 0 ? (
          <EmptyState title="No customers found" description="No customer is mapped to this scope yet." />
        ) : (
          <div className="segmentation-block-grid">
            {filtered.map((contract, index) => (
              <button
                key={contract.id}
                type="button"
                className="segmentation-customer-card"
                onClick={() => onNavigate(`/contracts/${contract.id}`)}
              >
                <div className="segmentation-customer-card-top">
                  <span className="segmentation-rank">#{index + 1}</span>
                  <span className="segmentation-currency-tag">{contract.currency}</span>
                </div>
                <div className="segmentation-customer-name">{contract.customerName}</div>
                <div className="segmentation-customer-meta">
                  <span>{contract.contractName}</span>
                  <span>{contract.team}</span>
                </div>
                <div className="segmentation-customer-value">
                  {formatCurrency(contract.value, contract.currency)}
                </div>
                <div className="segmentation-customer-foot">
                  <span>{contract.scopes?.length || 0} scopes</span>
                  <span>Open contract</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
