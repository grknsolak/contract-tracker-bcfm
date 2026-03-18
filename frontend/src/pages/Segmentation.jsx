import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/Card";
import Badge from "../components/Badge";
import EmptyState from "../components/EmptyState";
import { formatCurrency, daysUntil } from "../utils/date";
import { getFxLatest } from "../api";
import { getStageMeta, renewalTone } from "../utils/status";

function normalizeUsdValue(contract, rate) {
  const rawValue = Number(contract.value || 0);
  if (!rawValue) return 0;
  if (contract.currency === "TL") {
    return rate ? rawValue / rate : 0;
  }
  return rawValue;
}

export default function Segmentation({ contracts }) {
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
        remainingDays: daysUntil(contract.endDate),
      }))
      .sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0))
      .slice(0, 10);
  }, [contracts, selectedScope, fx.rate]);

  const totalValue = useMemo(
    () => filtered.reduce((sum, contract) => sum + (contract.usdValue || 0), 0),
    [filtered]
  );

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
      </Card>

      <Card
        title={selectedScope === "All" ? "Top 10 customers across all scopes" : `Top 10 customers for ${selectedScope}`}
        subtitle={`Ranked by contract value${filtered.length ? ` · ${filtered.length} customers · ${formatCurrency(totalValue, "USD")}` : ""}`}
      >
        {filtered.length === 0 ? (
          <EmptyState title="No customers found" description="No customer is mapped to this scope yet." />
        ) : (
          <div className="table segmentation-table">
            <div className="table-head">
              <div>Customer</div>
              <div>Revenue</div>
              <div>Team</div>
              <div>Stage</div>
              <div>Renewal</div>
              <div>Remaining</div>
              <div>Scopes</div>
            </div>
            <div className="table-body">
              {filtered.map((contract, index) => {
                const stageMeta = getStageMeta(contract.stage);
                return (
                  <div key={contract.id} className={`table-row ${index < 3 ? "top-tier" : ""}`}>
                    <div>
                      <div className="primary-text">{contract.customerName}</div>
                      <div className="muted">{contract.contractName}</div>
                    </div>
                    <div>{formatCurrency(contract.usdValue, "USD")}</div>
                    <div>{contract.team || "-"}</div>
                    <div>
                      <Badge tone={stageMeta.tone}>{stageMeta.label}</Badge>
                    </div>
                    <div>
                      <Badge tone={renewalTone[contract.renewalStatus] || "neutral"}>
                        {contract.renewalStatus}
                      </Badge>
                    </div>
                    <div className={contract.remainingDays != null && contract.remainingDays < 0 ? "text-danger" : ""}>
                      {contract.remainingDays == null
                        ? "-"
                        : contract.remainingDays < 0
                          ? "Expired"
                          : `${contract.remainingDays} days`}
                    </div>
                    <div className="scope-tags">
                      {(contract.scopes || []).map((scope) => (
                        <span key={scope} className={`tag ${scope === selectedScope ? "tag-active-scope" : ""}`}>
                          {scope === "Other" && contract.otherScopeText ? contract.otherScopeText : scope}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
