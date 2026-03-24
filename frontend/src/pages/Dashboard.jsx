import React, { useMemo, useState } from "react";
import Badge from "../components/Badge";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import { daysUntil, formatCurrency, formatDate } from "../utils/date";
import { getPortfolioOperationalMetrics } from "../utils/contractMetrics";
import { getRenewalRates } from "../utils/pricing";
import { normalizeStage, renewalTone } from "../utils/status";

const quarterLabels = ["Q1", "Q2", "Q3", "Q4"];

function getQuarter(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor(date.getMonth() / 3);
}

function getQuarterSummary(contracts) {
  const buckets = quarterLabels.map((label, index) => ({ label, index, contracts: [] }));
  contracts.forEach((contract) => {
    const qi = getQuarter(contract.endDate);
    if (qi == null) return;
    buckets[qi].contracts.push(contract);
  });
  return buckets.map((b) => ({
    ...b,
    contracts: b.contracts.sort((a, b) => new Date(a.endDate) - new Date(b.endDate)),
  }));
}

function getUniqueCustomerContracts(contracts) {
  const byCustomer = new Map();
  contracts.forEach((contract) => {
    const key = contract.customerName;
    const current = byCustomer.get(key);
    if (!current || new Date(contract.endDate) > new Date(current.endDate)) {
      byCustomer.set(key, contract);
    }
  });
  return Array.from(byCustomer.values()).sort((a, b) => a.customerName.localeCompare(b.customerName));
}

// ── Gauge Chart ─────────────────────────────────────────────────────────────
function GaugeChart({ value, maxValue = 50 }) {
  const pct = Math.min(Math.max(Number(value) / maxValue, 0), 1);
  const r = 36;
  const cx = 52, cy = 52;
  const circ = Math.PI * r; // ~113.1

  const arcPath = `M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`;

  const trackColor = "var(--surface-3)";
  const fillColor =
    value <= 0
      ? "var(--muted)"
      : value < 15
      ? "var(--info)"
      : value < 30
      ? "var(--primary)"
      : "var(--success)";

  const gaugeOffset = circ * (1 - pct);

  return (
    <svg viewBox="0 0 104 60" className="gauge-svg" aria-label={`${value}% average renewal rate`}>
      {/* Background track */}
      <path d={arcPath} fill="none" stroke={trackColor} strokeWidth="10" strokeLinecap="round" />
      {/* Fill arc */}
      <path
        d={arcPath}
        fill="none"
        stroke={fillColor}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circ}
        style={{ strokeDashoffset: gaugeOffset, transition: "stroke-dashoffset 0.85s cubic-bezier(.4,0,.2,1)" }}
      />
      {/* Needle dot at center */}
      <circle cx={cx} cy={cy} r="3" fill={fillColor} opacity="0.6" />
      {/* Value label */}
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        fontSize="14"
        fontWeight="700"
        fill="var(--text)"
        fontFamily="var(--font-mono)"
        letterSpacing="-0.5"
      >
        {value > 0 ? `+${value}%` : "—"}
      </text>
      <text
        x={cx}
        y={cy + 7}
        textAnchor="middle"
        fontSize="7"
        fill="var(--text-secondary)"
        fontFamily="var(--font-body)"
        letterSpacing="0.3"
      >
        AVG ZAM
      </text>
    </svg>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard({ contracts, onNavigate }) {
  const [selectedMetric, setSelectedMetric] = useState(null);

  const totalCustomers = useMemo(
    () => new Set(contracts.map((c) => c.customerName)).size,
    [contracts]
  );
  const operationalMetrics = useMemo(() => getPortfolioOperationalMetrics(contracts), [contracts]);
  const customerContracts = useMemo(() => getUniqueCustomerContracts(contracts), [contracts]);

  const metrics = useMemo(() => {
    const activeCustomers = new Set(
      contracts
        .filter((c) => normalizeStage(c.stage) !== "Expired" && c.renewalStatus !== "Lost")
        .map((c) => c.customerName)
    ).size;
    const next30 = contracts.filter((c) => {
      const d = daysUntil(c.endDate);
      return typeof d === "number" && d >= 0 && d <= 30;
    }).length;
    const churned = new Set(
      contracts
        .filter((c) => daysUntil(c.endDate) < 0 || c.renewalStatus === "Lost")
        .map((c) => c.customerName)
    ).size;
    return { activeCustomers, next30, churned };
  }, [contracts]);

  // ── Team rows: scope-level zam rate averages ─────────────────────────────
  const teamRows = useMemo(() => {
    const grouped = contracts.reduce((acc, contract) => {
      const team = contract.team || "Unassigned";
      if (!acc[team]) acc[team] = { team, contracts: [], customerNames: new Set() };
      acc[team].contracts.push(contract);
      acc[team].customerNames.add(contract.customerName);
      return acc;
    }, {});

    return Object.values(grouped)
      .map((group) => {
        // Per-scope: average zam rate across all contracts in this team
        const scopeSum = {};
        const scopeN = {};
        group.contracts.forEach((contract) => {
          const rates = getRenewalRates(contract);
          (contract.scopes || []).forEach((scope) => {
            const rate = Number(rates[scope] || 0);
            if (rate > 0) {
              scopeSum[scope] = (scopeSum[scope] || 0) + rate;
              scopeN[scope] = (scopeN[scope] || 0) + 1;
            }
          });
        });

        const scopeRates = Object.entries(scopeSum)
          .map(([scope, sum]) => ({ scope, rate: Math.round(sum / scopeN[scope]) }))
          .sort((a, b) => b.rate - a.rate);

        const teamAvgRate =
          scopeRates.length > 0
            ? Math.round(scopeRates.reduce((s, r) => s + r.rate, 0) / scopeRates.length)
            : 0;

        return {
          team: group.team,
          customerCount: group.customerNames.size,
          contractCount: group.contracts.length,
          scopeRates,
          teamAvgRate,
        };
      })
      .sort((a, b) => b.teamAvgRate - a.teamAvgRate || a.team.localeCompare(b.team));
  }, [contracts]);

  const companyAvgRate = useMemo(() => {
    const all = teamRows.filter((t) => t.teamAvgRate > 0);
    if (!all.length) return 0;
    return Math.round(all.reduce((s, t) => s + t.teamAvgRate, 0) / all.length);
  }, [teamRows]);

  const quarterSummary = useMemo(() => getQuarterSummary(contracts), [contracts]);

  const metricCustomerMap = useMemo(() => {
    const active = getUniqueCustomerContracts(
      contracts.filter((c) => normalizeStage(c.stage) !== "Expired" && c.renewalStatus !== "Lost")
    );
    const renewals30 = getUniqueCustomerContracts(
      contracts.filter((c) => {
        const d = daysUntil(c.endDate);
        return typeof d === "number" && d >= 0 && d <= 30;
      })
    );
    const churn = getUniqueCustomerContracts(
      contracts.filter((c) => daysUntil(c.endDate) < 0 || c.renewalStatus === "Lost")
    );
    return {
      customers: { title: "All customers", description: "Open a customer to jump straight to its contract detail.", items: customerContracts },
      active: { title: "Active customers", description: "Customers with healthy active contracts.", items: active },
      renewals30: { title: "Renewals in 30 days", description: "Customers needing immediate renewal follow-up.", items: renewals30 },
      churn: { title: "Churned customers", description: "Customers that are overdue or marked as lost.", items: churn },
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
      {/* Hero */}
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

      {/* Headline KPIs */}
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

      {/* Quarter + Team grid */}
      <div className="dashboard-main-grid">
        {/* Quarter view */}
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

        {/* Team summary — scope gauge rows */}
        <Card
          title="Team summary"
          subtitle="Sözleşme yenileme oranı"
        >
          {/* Company-wide renewal rate */}
          {companyAvgRate > 0 && (
            <div className="ts-company-header">
              <GaugeChart value={companyAvgRate} maxValue={50} />
              <div className="ts-company-info">
                <span className="ts-company-label">Şirket geneli ortalama zam</span>
                <span className="ts-company-sub">
                  {teamRows.filter((t) => t.teamAvgRate > 0).length} takım ·{" "}
                  {contracts.length} sözleşme
                </span>
              </div>
            </div>
          )}

          <div className="ts-rows">
            {teamRows.map((row) => (
              <div key={row.team} className="ts-row">
                {/* Left: team identity box */}
                <div className="ts-row-label">
                  <span className="ts-row-team-name">{row.team}</span>
                  <span className="ts-row-team-meta">{row.customerCount} müşteri</span>
                  {row.teamAvgRate > 0 && (
                    <span
                      className={`ts-row-avg ${
                        row.teamAvgRate >= 30
                          ? "ts-rate--high"
                          : row.teamAvgRate >= 15
                          ? "ts-rate--mid"
                          : "ts-rate--low"
                      }`}
                    >
                      +{row.teamAvgRate}%
                    </span>
                  )}
                </div>

                {/* Right: scope gauges side-by-side */}
                <div className="ts-row-gauges">
                  {row.scopeRates.length > 0 ? (
                    row.scopeRates.map(({ scope, rate }) => (
                      <div key={scope} className="ts-scope-gauge-cell">
                        <GaugeChart value={rate} maxValue={50} />
                        <span className="ts-scope-gauge-label">{scope}</span>
                      </div>
                    ))
                  ) : (
                    <span className="ts-no-rates">Henüz zam oranı girilmedi</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Metric modal */}
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
