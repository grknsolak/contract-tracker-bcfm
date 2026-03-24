import React, { useMemo, useState } from "react";
import Badge from "../components/Badge";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import { daysUntil, formatCurrency, formatDate, formatRemainingDays } from "../utils/date";
import { getPortfolioOperationalMetrics } from "../utils/contractMetrics";
import { normalizeStage, renewalTone } from "../utils/status";

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

function getUniqueCustomerContracts(contracts) {
  const byCustomer = new Map();

  contracts.forEach((contract) => {
    const key = contract.customerName;
    const current = byCustomer.get(key);
    if (!current || new Date(contract.endDate).getTime() > new Date(current.endDate).getTime()) {
      byCustomer.set(key, contract);
    }
  });

  return Array.from(byCustomer.values()).sort((a, b) => a.customerName.localeCompare(b.customerName));
}

export default function Dashboard({ contracts, onNavigate }) {
  const [selectedMetric, setSelectedMetric] = useState(null);
  const totalCustomers = useMemo(() => new Set(contracts.map((contract) => contract.customerName)).size, [contracts]);
  const operationalMetrics = useMemo(() => getPortfolioOperationalMetrics(contracts), [contracts]);
  const customerContracts = useMemo(() => getUniqueCustomerContracts(contracts), [contracts]);

  const metrics = useMemo(() => {
    const activeCustomers = new Set(
      contracts
        .filter((contract) => normalizeStage(contract.stage) !== "Expired" && contract.renewalStatus !== "Lost")
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

    const churned = new Set(
      contracts
        .filter((contract) => daysUntil(contract.endDate) < 0 || contract.renewalStatus === "Lost")
        .map((contract) => contract.customerName)
    ).size;

    return { activeCustomers, next30, next60, churned };
  }, [contracts]);

  const teamRows = useMemo(() => {
    const grouped = contracts.reduce((acc, contract) => {
      const team = contract.team || "Unassigned";
      if (!acc[team]) {
        acc[team] = { team, total: 0, renewed: 0 };
      }

      const normalizedStage = normalizeStage(contract.stage);
      const remainingDays = daysUntil(contract.endDate);
      const isExpiredOrLost =
        normalizedStage === "Expired" ||
        contract.renewalStatus === "Lost" ||
        (typeof remainingDays === "number" && remainingDays < 0);

      acc[team].total += 1;
      if (!isExpiredOrLost) acc[team].renewed += 1;

      return acc;
    }, {});

    return Object.values(grouped)
      .map((row) => ({
        ...row,
        rate: row.total > 0 ? Math.round((row.renewed / row.total) * 100) : 0,
      }))
      .filter((row) => row.total > 0)
      .sort((a, b) => b.rate - a.rate || a.team.localeCompare(b.team));
  }, [contracts]);

  const companyRenewalRate = useMemo(() => {
    const total = contracts.length;
    if (!total) return null;
    const renewed = contracts.filter((c) => {
      const stage = normalizeStage(c.stage);
      const rem = daysUntil(c.endDate);
      return stage !== "Expired" && c.renewalStatus !== "Lost" && !(typeof rem === "number" && rem < 0);
    }).length;
    return Math.round((renewed / total) * 100);
  }, [contracts]);

  const quarterSummary = useMemo(() => getQuarterSummary(contracts), [contracts]);

  const metricCustomerMap = useMemo(() => {
    const active = getUniqueCustomerContracts(
      contracts.filter((contract) => normalizeStage(contract.stage) !== "Expired" && contract.renewalStatus !== "Lost")
    );
    const renewals30 = getUniqueCustomerContracts(
      contracts.filter((contract) => {
        const days = daysUntil(contract.endDate);
        return typeof days === "number" && days >= 0 && days <= 30;
      })
    );
    const churn = getUniqueCustomerContracts(
      contracts.filter((contract) => daysUntil(contract.endDate) < 0 || contract.renewalStatus === "Lost")
    );

    return {
      customers: {
        title: "All customers",
        description: "Open a customer to jump straight to its contract detail.",
        items: customerContracts,
      },
      active: {
        title: "Active customers",
        description: "Customers with healthy active contracts.",
        items: active,
      },
      renewals30: {
        title: "Renewals in 30 days",
        description: "Customers needing immediate renewal follow-up.",
        items: renewals30,
      },
      churn: {
        title: "Churned customers",
        description: "Customers that are overdue or marked as lost.",
        items: churn,
      },
    };
  }, [contracts, customerContracts]);

  const headlineCards = [
    { id: "customers", label: "Customers", value: totalCustomers, meta: `${contracts.length} total contracts` },
    { id: "active", label: "Active", value: metrics.activeCustomers, meta: "Healthy customer base" },
    { id: "renewals30", label: "Renewals in 30d", value: metrics.next30, meta: "Immediate follow-up" },
    { id: "churn", label: "Churn", value: metrics.churned, meta: "Lost customers", tone: "danger" },
  ];

  return (
    <div className="page dashboard-simple">
      <div className="dashboard-hero">
        <div>
          <h2 className="dashboard-title">Portfolio overview</h2>
          <p className="dashboard-copy">A cleaner view of customer health, upcoming renewals, and where attention is needed now.</p>
        </div>
        <div className="dashboard-kpis-inline">
          <div className="dashboard-kpi-inline">
            <span className="dashboard-kpi-label">Avg renewal</span>
            <strong>{operationalMetrics.averageRenewalDays != null ? `${operationalMetrics.averageRenewalDays}d` : "-"}</strong>
          </div>
          <div className="dashboard-kpi-inline">
            <span className="dashboard-kpi-label">Cycle time</span>
            <strong>{operationalMetrics.averageSalesCycleDays != null ? `${operationalMetrics.averageSalesCycleDays}d` : "-"}</strong>
          </div>
          <div className="dashboard-kpi-inline">
            <span className="dashboard-kpi-label">Delayed actions</span>
            <strong className={operationalMetrics.overdueActionsCount ? "text-danger" : ""}>{operationalMetrics.overdueActionsCount}</strong>
          </div>
        </div>
      </div>

      <div className="dashboard-headline-grid">
        {headlineCards.map((item) => (
          <Card key={item.label} className="dashboard-headline-card dashboard-headline-card-clickable">
            <button className="dashboard-headline-button" onClick={() => setSelectedMetric(item.id)}>
            <div className="dashboard-headline-label">{item.label}</div>
            <div className={`dashboard-headline-value ${item.tone || ""}`.trim()}>{item.value}</div>
            <div className="dashboard-headline-meta">{item.meta}</div>
            </button>
          </Card>
        ))}
      </div>

      <div className="dashboard-main-grid">
        <Card title="Quarter view" subtitle="Contracts grouped by end quarter">
          <div className="dashboard-quarter-grid">
            {quarterSummary.map((quarter) => (
              <div key={quarter.label} className="dashboard-quarter-card">
                <div className="dashboard-quarter-head">
                  <strong>{quarter.label}</strong>
                  <span className="muted">{quarter.contracts.length} contracts</span>
                </div>
                {quarter.contracts.length === 0 ? (
                  <div className="muted">No contracts</div>
                ) : (
                  <div className="dashboard-quarter-list">
                    {quarter.contracts.slice(0, 4).map((contract) => (
                      <button
                        key={contract.id}
                        className="dashboard-quarter-item"
                        onClick={() => onNavigate(`/contracts/${contract.id}`)}
                      >
                        <span className="primary-text">{contract.customerName}</span>
                        <span className="muted">{formatDate(contract.endDate)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card title="Team summary" subtitle="Annual renewal rate by team">
          {companyRenewalRate !== null && (
            <div className="team-summary-company-rate">
              <div className="team-summary-company-rate-label">Company-wide renewal rate</div>
              <div className="team-summary-company-rate-value">
                <span
                  className={
                    companyRenewalRate >= 80
                      ? "team-rate-pct team-rate-pct--good"
                      : companyRenewalRate >= 50
                      ? "team-rate-pct team-rate-pct--warn"
                      : "team-rate-pct team-rate-pct--danger"
                  }
                >
                  {companyRenewalRate}%
                </span>
                <span className="team-summary-company-rate-meta">{contracts.length} total contracts</span>
              </div>
              <div className="team-summary-company-bar-track">
                <div
                  className={
                    companyRenewalRate >= 80
                      ? "team-summary-company-bar-fill team-summary-company-bar-fill--good"
                      : companyRenewalRate >= 50
                      ? "team-summary-company-bar-fill team-summary-company-bar-fill--warn"
                      : "team-summary-company-bar-fill team-summary-company-bar-fill--danger"
                  }
                  style={{ width: `${companyRenewalRate}%` }}
                />
              </div>
            </div>
          )}
          <div className="dashboard-team-renewal-list">
            {teamRows.map((row) => (
              <div key={row.team} className="dashboard-team-renewal-row">
                <div className="dashboard-team-renewal-top">
                  <span className="dashboard-team-renewal-name">{row.team}</span>
                  <span
                    className={
                      row.rate >= 80
                        ? "team-rate-pct team-rate-pct--good"
                        : row.rate >= 50
                        ? "team-rate-pct team-rate-pct--warn"
                        : "team-rate-pct team-rate-pct--danger"
                    }
                  >
                    {row.rate}%
                  </span>
                </div>
                <div className="dashboard-team-renewal-bar-track">
                  <div
                    className={
                      row.rate >= 80
                        ? "dashboard-team-renewal-bar-fill dashboard-team-renewal-bar-fill--good"
                        : row.rate >= 50
                        ? "dashboard-team-renewal-bar-fill dashboard-team-renewal-bar-fill--warn"
                        : "dashboard-team-renewal-bar-fill dashboard-team-renewal-bar-fill--danger"
                    }
                    style={{ width: `${row.rate}%` }}
                  />
                </div>
                <div className="dashboard-team-renewal-meta">
                  <span className="muted">{row.renewed} of {row.total} contracts renewed</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {selectedMetric ? (
        <Modal
          title={metricCustomerMap[selectedMetric]?.title || "Customers"}
          description={metricCustomerMap[selectedMetric]?.description}
          onClose={() => setSelectedMetric(null)}
        >
          {metricCustomerMap[selectedMetric]?.items?.length ? (
            <div className="dashboard-metric-list">
              {metricCustomerMap[selectedMetric].items.map((contract) => (
                <button
                  key={contract.id}
                  className="dashboard-metric-item"
                  onClick={() => {
                    setSelectedMetric(null);
                    onNavigate(`/contracts/${contract.id}`);
                  }}
                >
                  <div>
                    <div className="primary-text">{contract.customerName}</div>
                    <div className="muted">
                      {contract.contractName} · {formatCurrency(contract.value, contract.currency)}
                    </div>
                  </div>
                  <div className="dashboard-metric-side">
                    <span className="muted">{formatDate(contract.endDate)}</span>
                    <Badge tone={renewalTone[contract.renewalStatus] || "neutral"}>{contract.renewalStatus}</Badge>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState title="No customers" description="There are no customers in this group right now." />
          )}
        </Modal>
      ) : null}
    </div>
  );
}
