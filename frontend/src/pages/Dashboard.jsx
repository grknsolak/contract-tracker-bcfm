import React, { useMemo } from "react";
import Card from "../components/Card";
import Badge from "../components/Badge";
import PieChart from "../components/PieChart";
import EmptyState from "../components/EmptyState";
import { daysUntil, formatDate, formatCurrency } from "../utils/date";
import { getPortfolioOperationalMetrics } from "../utils/contractMetrics";
import { getStageMeta, renewalTone } from "../utils/status";

const quarterLabels = ["Q1", "Q2", "Q3", "Q4"];

function getQuarter(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor(date.getMonth() / 3);
}

function getQuarterSummary(contracts) {
  const buckets = quarterLabels.map((label, index) => ({
    label,
    index,
    contracts: [],
  }));

  contracts.forEach((contract) => {
    const quarterIndex = getQuarter(contract.endDate);
    if (quarterIndex == null) return;
    buckets[quarterIndex].contracts.push(contract);
  });

  return buckets.map((bucket) => ({
    ...bucket,
    contracts: bucket.contracts.sort((a, b) => new Date(a.endDate) - new Date(b.endDate)),
  }));
}

export default function Dashboard({ contracts, onNavigate }) {
  const totalCustomers = useMemo(() => new Set(contracts.map((contract) => contract.customerName)).size, [contracts]);

  const metrics = useMemo(() => {
    const activeCustomers = new Set(
      contracts
        .filter(
          (contract) =>
            contract.stage !== "Expired" &&
            contract.renewalStatus !== "Lost"
        )
        .map((contract) => contract.customerName)
    ).size;

    const churnCustomers = new Set(
      contracts
        .filter(
          (contract) =>
            daysUntil(contract.endDate) < 0 || contract.renewalStatus === "Lost" || contract.stage === "Expired"
        )
        .map((contract) => contract.customerName)
    ).size;

    const next30 = contracts.filter((contract) => {
      const days = daysUntil(contract.endDate);
      return typeof days === "number" && days >= 0 && days <= 30;
    }).length;

    const next60 = contracts.filter((contract) => {
      const days = daysUntil(contract.endDate);
      return typeof days === "number" && days >= 31 && days <= 60;
    }).length;

    const expired = contracts.filter((contract) => daysUntil(contract.endDate) < 0).length;

    return { activeCustomers, churnCustomers, next30, next60, expired };
  }, [contracts]);
  const operationalMetrics = useMemo(() => getPortfolioOperationalMetrics(contracts), [contracts]);

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
  const totalContracts = contracts.length;

  const riskContracts = useMemo(() => {
    return contracts
      .filter((contract) => {
        const days = daysUntil(contract.endDate);
        return typeof days === "number" && days <= 60;
      })
      .sort((a, b) => {
        const aDays = daysUntil(a.endDate) ?? 99999;
        const bDays = daysUntil(b.endDate) ?? 99999;
        return aDays - bDays;
      })
      .slice(0, 6);
  }, [contracts]);

  const quarterSummary = useMemo(() => getQuarterSummary(contracts), [contracts]);

  const statCards = [
    {
      label: "🟢 Active customers",
      value: metrics.activeCustomers,
      meta: "Healthy customer base",
      tone: "",
    },
    {
      label: "⚫ Churn count",
      value: metrics.churnCustomers,
      meta: "Lost or expired customers",
      tone: "",
    },
    {
      label: "🚨 Expiring in 30 days",
      value: metrics.next30,
      meta: "Immediate action required",
      tone: "emphasis",
    },
    {
      label: "⚠️ Expiring in 60 days",
      value: metrics.next60,
      meta: "Prepare renewal plan",
      tone: "",
    },
    {
      label: "⛔ Expired contracts",
      value: metrics.expired,
      meta: "Critical escalation needed",
      tone: "danger",
    },
  ];

  return (
    <div className="page">
      <div className="page-grid">
        {statCards.map((item) => (
          <Card key={item.label} className="stat-card executive-stat">
            <div className="stat-label">{item.label}</div>
            <div className={`stat-value ${item.tone}`.trim()}>{item.value}</div>
            <div className="stat-meta">{item.meta}</div>
          </Card>
        ))}
      </div>

      <div className="page-grid page-grid-operational">
        <Card className="stat-card operational-stat">
          <div className="stat-label">Average renewal time</div>
          <div className="stat-value">
            {operationalMetrics.averageRenewalDays != null ? `${operationalMetrics.averageRenewalDays}d` : "-"}
          </div>
          <div className="stat-meta">From renewal start to final decision</div>
        </Card>
        <Card className="stat-card operational-stat">
          <div className="stat-label">Sales cycle time</div>
          <div className="stat-value">
            {operationalMetrics.averageSalesCycleDays != null ? `${operationalMetrics.averageSalesCycleDays}d` : "-"}
          </div>
          <div className="stat-meta">Draft created to signed</div>
        </Card>
        <Card className="stat-card operational-stat">
          <div className="stat-label">Contract closure time</div>
          <div className="stat-value">
            {operationalMetrics.averageClosureDays != null ? `${operationalMetrics.averageClosureDays}d` : "-"}
          </div>
          <div className="stat-meta">Draft created to active go-live</div>
        </Card>
        <Card className="stat-card operational-stat">
          <div className="stat-label">Delayed actions</div>
          <div className={`stat-value ${operationalMetrics.overdueActionsCount ? "danger" : ""}`.trim()}>
            {operationalMetrics.overdueActionsCount}
          </div>
          <div className="stat-meta">Open actions past due date</div>
        </Card>
      </div>

      <div className="split-grid">
        <Card title="Contract status distribution" subtitle="Overall portfolio health">
          <div className="pie-layout">
            <PieChart
              data={pieData}
              size={220}
              innerRadius={70}
              centerValue={totalContracts}
              centerLabel={`${totalCustomers} customers`}
              showPercentages
            />
            <div className="pie-legend">
              {Object.entries(stageCounts).map(([stage, count]) => {
                const meta = getStageMeta(stage);
                const percentage = totalContracts ? Math.round((count / totalContracts) * 100) : 0;
                return (
                  <div key={stage} className="legend-item">
                    <span className="legend-dot" style={{ background: stageColors[stage] || "#cbd5f5" }} />
                    <div className="legend-copy">
                      <div className="legend-label">{stage}</div>
                      <div className="legend-meta">
                        {count} contracts · {percentage}%
                      </div>
                    </div>
                    <div className="legend-stats">
                      <div className="legend-percent">{percentage}%</div>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <Card title="Critical contracts" subtitle="What needs discussion now">
          {riskContracts.length === 0 ? (
            <EmptyState title="Nothing critical" description="No contracts are expiring in the next 60 days." />
          ) : (
            <div className="priority-list">
              {riskContracts.map((contract) => {
                const remaining = daysUntil(contract.endDate);
                const isCritical = remaining < 0;
                const isUrgent = remaining >= 0 && remaining <= 30;
                return (
                  <button
                    key={contract.id}
                    className="priority-item"
                    onClick={() => onNavigate(`/contracts/${contract.id}`)}
                  >
                    <div>
                      <div className="priority-title">{contract.customerName}</div>
                      <div className="priority-meta">
                        {contract.contractName} · {formatCurrency(contract.value, contract.currency)}
                      </div>
                    </div>
                    <div className="priority-badges">
                      <Badge tone={renewalTone[contract.renewalStatus] || "neutral"}>
                        {contract.renewalStatus}
                      </Badge>
                      <Badge tone={isCritical ? "danger" : isUrgent ? "warning" : "info"}>
                        {isCritical ? "Critical" : isUrgent ? "Needs Attention" : "Upcoming"}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card title="Quarterly contract view" subtitle="Customers grouped by contract start quarter">
        <div className="quarter-grid">
          {quarterSummary.map((quarter) => (
            <div key={quarter.label} className="quarter-card">
              <div className="quarter-head">
                <div>
                  <div className="quarter-title">{quarter.label}</div>
                  <div className="quarter-meta">{quarter.contracts.length} contracts</div>
                </div>
              </div>

              {quarter.contracts.length === 0 ? (
                <div className="quarter-empty">No contracts in this quarter.</div>
              ) : (
                <div className="quarter-list">
                  {quarter.contracts.slice(0, 6).map((contract) => (
                    <button
                      key={contract.id}
                      className="quarter-item quarter-item-minimal"
                      onClick={() => onNavigate(`/contracts/${contract.id}`)}
                    >
                      <span className="primary-text">{contract.customerName}</span>
                      <span className="muted">{formatDate(contract.startDate)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
