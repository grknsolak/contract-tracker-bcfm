import React, { useMemo, useState } from "react";
import Card from "../components/Card";
import Badge from "../components/Badge";
import EmptyState from "../components/EmptyState";
import { daysUntil, formatDate } from "../utils/date";
import { getStageMeta } from "../utils/status";

function Section({ title, description, items, onNavigate }) {
  return (
    <Card title={title} subtitle={description}>
      {items.length === 0 ? (
        <EmptyState title="Nothing urgent" description="No contracts match this category." />
      ) : (
        <div className="alert-list">
          {items.map((contract) => {
            const meta = getStageMeta(contract.stage);
            const remaining = daysUntil(contract.endDate);
            return (
              <div key={contract.id} className="alert-item">
                <div>
                  <div className="primary-text">{contract.customerName}</div>
                  <div className="muted">{contract.contractName}</div>
                </div>
                <div className="alert-meta">
                  <div>{formatDate(contract.endDate)}</div>
                  <div className={remaining < 0 ? "text-danger" : ""}>
                    {remaining < 0 ? "Expired" : `${remaining} days left`}
                  </div>
                </div>
                <Badge tone={meta.tone}>{meta.label}</Badge>
                <button className="btn btn-ghost" onClick={() => onNavigate(`/contracts/${contract.id}`)}>
                  View
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export default function Alerts({ contracts, onNavigate }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [stageFilter, setStageFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filtered = useMemo(() => {
    return contracts.filter((contract) => {
      const matchesSearch =
        contract.customerName.toLowerCase().includes(search.toLowerCase()) ||
        contract.contractName.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "All" || contract.contractType === typeFilter;
      const matchesStage = stageFilter === "All" || contract.stage === stageFilter;
      const withinStart = startDate ? new Date(contract.endDate) >= new Date(startDate) : true;
      const withinEnd = endDate ? new Date(contract.endDate) <= new Date(endDate) : true;
      return matchesSearch && matchesType && matchesStage && withinStart && withinEnd;
    });
  }, [contracts, search, typeFilter, stageFilter, startDate, endDate]);

  const expiring30 = filtered.filter((c) => {
    const days = daysUntil(c.endDate);
    return typeof days === "number" && days >= 0 && days <= 30;
  });
  const expiring60 = filtered.filter((c) => {
    const days = daysUntil(c.endDate);
    return typeof days === "number" && days >= 31 && days <= 60;
  });
  const expired = filtered.filter((c) => daysUntil(c.endDate) < 0);

  const types = Array.from(new Set(contracts.map((c) => c.contractType))).filter(Boolean);

  return (
    <div className="page">
      <Card title="Expiration tracking" subtitle="Monitor 30/60-day windows and expired contracts">
        <div className="filters">
          <div className="field">
            <label>Search customer</label>
            <input value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <div className="field">
            <label>Contract type</label>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="All">All types</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Stage</label>
            <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}>
              <option value="All">All stages</option>
              <option value="Draft">Draft</option>
              <option value="Under Review">Under Review</option>
              <option value="Approval Pending">Approval Pending</option>
              <option value="Signed">Signed</option>
              <option value="Active">Active</option>
              <option value="Renewal Upcoming">Renewal Upcoming</option>
              <option value="Expired">Expired</option>
            </select>
          </div>
          <div className="field">
            <label>End date from</label>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </div>
          <div className="field">
            <label>End date to</label>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </div>
        </div>
      </Card>

      <div className="alerts-grid">
        <Section
          title="Expiring within 30 days"
          description="Priority renewals requiring immediate attention"
          items={expiring30}
          onNavigate={onNavigate}
        />
        <Section
          title="Expiring within 60 days"
          description="Start renewal conversations and approvals"
          items={expiring60}
          onNavigate={onNavigate}
        />
        <Section
          title="Expired contracts"
          description="Follow up with owners and account leads"
          items={expired}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
}
