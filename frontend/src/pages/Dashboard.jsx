import React, { useMemo, useState } from "react";
import Card from "../components/Card";
import Badge from "../components/Badge";
import PieChart from "../components/PieChart";
import EmptyState from "../components/EmptyState";
import { daysUntil, formatDate, formatCurrency } from "../utils/date";
import { getStageMeta } from "../utils/status";

export default function Dashboard({ contracts, activity, onNavigate }) {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("All");

  const metrics = useMemo(() => {
    const totalCustomers = new Set(contracts.map((c) => c.customerName)).size;
    const activeContracts = contracts.filter((c) => c.stage === "Active").length;
    const next30 = contracts.filter((c) => {
      const days = daysUntil(c.endDate);
      return typeof days === "number" && days >= 0 && days <= 30;
    }).length;
    const next60 = contracts.filter((c) => {
      const days = daysUntil(c.endDate);
      return typeof days === "number" && days >= 31 && days <= 60;
    }).length;
    const expired = contracts.filter((c) => daysUntil(c.endDate) < 0).length;
    return { totalCustomers, activeContracts, next30, next60, expired };
  }, [contracts]);

  const filteredContracts = useMemo(() => {
    return contracts.filter((contract) => {
      const matchesSearch =
        contract.customerName.toLowerCase().includes(search.toLowerCase()) ||
        contract.contractName.toLowerCase().includes(search.toLowerCase()) ||
        contract.owner.toLowerCase().includes(search.toLowerCase());
      const matchesStage = stageFilter === "All" || contract.stage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [contracts, search, stageFilter]);

  const stageCounts = useMemo(() => {
    return contracts.reduce((acc, contract) => {
      acc[contract.stage] = (acc[contract.stage] || 0) + 1;
      return acc;
    }, {});
  }, [contracts]);

  const stageColors = {
    Draft: "#94a3b8",
    "Under Review": "#60a5fa",
    "Approval Pending": "#f59e0b",
    Signed: "#6366f1",
    Active: "#10b981",
    "Renewal Upcoming": "#f59e0b",
    Expired: "#ef4444",
  };

  const pieData = useMemo(() => {
    return Object.entries(stageCounts).map(([stage, count]) => ({
      label: stage,
      value: count,
      color: stageColors[stage] || "#cbd5f5",
    }));
  }, [stageCounts]);

  return (
    <div className="page">
      <div className="page-grid">
        <Card className="stat-card">
          <div className="stat-label">Total customers</div>
          <div className="stat-value">{metrics.totalCustomers}</div>
          <div className="stat-meta">Across all regions</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-label">Active contracts</div>
          <div className="stat-value">{metrics.activeContracts}</div>
          <div className="stat-meta">Currently delivering</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-label">Expiring in 30 days</div>
          <div className="stat-value emphasis">{metrics.next30}</div>
          <div className="stat-meta">Immediate renewals</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-label">Expiring in 60 days</div>
          <div className="stat-value">{metrics.next60}</div>
          <div className="stat-meta">Upcoming attention</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-label">Expired contracts</div>
          <div className="stat-value danger">{metrics.expired}</div>
          <div className="stat-meta">Require follow-up</div>
        </Card>
      </div>

      <div className="split-grid">
        <Card title="Contract status distribution" subtitle="Portfolio overview">
          <div className="pie-layout">
            <PieChart data={pieData} size={220} innerRadius={70} />
            <div className="pie-legend">
              {Object.entries(stageCounts).map(([stage, count]) => {
                const meta = getStageMeta(stage);
                return (
                  <div key={stage} className="legend-item">
                    <span className="legend-dot" style={{ background: stageColors[stage] || "#cbd5f5" }} />
                    <div>
                      <div className="legend-label">{stage}</div>
                      <div className="legend-meta">{count} contracts</div>
                    </div>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
          <button className="link-button" onClick={() => onNavigate("/alerts")}>
            Review expiring contracts
          </button>
        </Card>

        <Card title="Recent activity" subtitle="Latest updates">
          <div className="activity-list">
            {activity.map((item) => (
              <div key={item.id} className="activity-item">
                <div>
                  <div className="activity-title">{item.title}</div>
                  <div className="activity-meta">{item.meta}</div>
                </div>
                <div className="activity-time">{item.time}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Quick filters" subtitle="Find what needs attention">
        <div className="filters">
          <div className="field">
            <label>Search</label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by customer, contract, or owner"
            />
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
        </div>

        <div className="table table-compact">
          <div className="table-head">
            <div>Customer</div>
            <div>Contract</div>
            <div>End date</div>
            <div>Value</div>
            <div>Scopes</div>
            <div>Stage</div>
            <div>Remaining days</div>
          </div>
          <div className="table-body">
            {filteredContracts.length === 0 ? (
              <EmptyState
                title="No contracts found"
                description="Try adjusting your filters to locate a contract."
              />
            ) : (
              filteredContracts.slice(0, 5).map((contract) => {
                const meta = getStageMeta(contract.stage);
                const remaining = daysUntil(contract.endDate);
                return (
                  <div
                    key={contract.id}
                    className="table-row clickable"
                    onClick={() => onNavigate(`/contracts/${contract.id}`)}
                  >
                    <div>
                      <div className="primary-text">{contract.customerName}</div>
                      <div className="muted">Owner: {contract.owner}</div>
                    </div>
                    <div>{contract.contractName}</div>
                  <div>{formatDate(contract.endDate)}</div>
                  <div className="muted">{formatCurrency(contract.value, contract.currency)}</div>
                  <div className="scope-tags">
                    {(contract.scopes || []).length === 0 ? (
                      <span className="muted">-</span>
                    ) : (
                      (contract.scopes || []).map((scope) => (
                        <span key={scope} className="tag">
                          {scope === "Other" && contract.otherScopeText ? contract.otherScopeText : scope}
                        </span>
                      ))
                    )}
                  </div>
                  <div>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </div>
                    <div className={remaining < 0 ? "text-danger" : ""}>
                      {remaining < 0 ? "Expired" : `${remaining} days`}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
