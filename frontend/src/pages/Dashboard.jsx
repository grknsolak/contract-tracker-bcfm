import React, { useMemo, useState } from "react";
import Card from "../components/Card";
import Badge from "../components/Badge";
import EmptyState from "../components/EmptyState";
import { daysUntil, formatDate } from "../utils/date";
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
          <div className="status-distribution">
            {Object.entries(stageCounts).map(([stage, count]) => {
              const meta = getStageMeta(stage);
              const percent = Math.round((count / contracts.length) * 100);
              return (
                <div key={stage} className="status-row">
                  <div className="status-row-label">
                    <Badge tone={meta.tone}>{stage}</Badge>
                    <span>{count}</span>
                  </div>
                  <div className="status-bar">
                    <div className={`status-fill tone-${meta.tone}`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
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
