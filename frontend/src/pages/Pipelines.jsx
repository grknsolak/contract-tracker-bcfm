import React, { useMemo, useState } from "react";
import Card from "../components/Card";
import Badge from "../components/Badge";
import EmptyState from "../components/EmptyState";
import ProcessStepper from "../components/ProcessStepper";
import { daysUntil, formatCurrency, formatDate } from "../utils/date";
import { getContractBudgetSummary } from "../utils/pricing";
import { getStageMeta, renewalTone } from "../utils/status";
import { buildRenewalPipelines, pipelineStages, RENEWAL_PIPELINE_WINDOW_DAYS } from "../utils/pipelines";

export default function Pipelines({ contracts, onNavigate }) {
  const [stageFilter, setStageFilter] = useState("All");
  const [search, setSearch] = useState("");

  const pipelines = useMemo(() => buildRenewalPipelines(contracts), [contracts]);

  const filteredPipelines = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return pipelines.filter((pipeline) => {
      const matchesStage = stageFilter === "All" || pipeline.currentStage === stageFilter;
      const matchesSearch =
        !normalized ||
        pipeline.customerName.toLowerCase().includes(normalized) ||
        pipeline.contractName.toLowerCase().includes(normalized) ||
        pipeline.owner.toLowerCase().includes(normalized);
      return matchesStage && matchesSearch;
    });
  }, [pipelines, search, stageFilter]);

  const metrics = useMemo(() => {
    const active = pipelines.filter((item) => item.currentStage !== "Expired").length;
    const upcoming = pipelines.filter((item) => item.currentStage === "Renewal Protocol").length;
    const churned = pipelines.filter((item) => item.currentStage === "Expired").length;
    return { total: pipelines.length, active, upcoming, churned };
  }, [pipelines]);

  return (
    <div className="page">
      <Card
        title="Renewal pipelines"
        subtitle={`Contracts automatically enter this board ${RENEWAL_PIPELINE_WINDOW_DAYS} days before renewal.`}
      >
        <div className="filters">
          <div className="field">
            <label>Search</label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Customer, contract, or owner"
            />
          </div>
          <div className="field">
            <label>Current stage</label>
            <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}>
              <option value="All">All stages</option>
              {pipelineStages.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pipeline-summary-grid">
          <div className="pipeline-summary-card">
            <span className="pipeline-summary-label">Total pipelines</span>
            <strong>{metrics.total}</strong>
          </div>
          <div className="pipeline-summary-card">
            <span className="pipeline-summary-label">Ongoing</span>
            <strong>{metrics.active}</strong>
          </div>
          <div className="pipeline-summary-card">
            <span className="pipeline-summary-label">Renewal protocol</span>
            <strong>{metrics.upcoming}</strong>
          </div>
          <div className="pipeline-summary-card">
            <span className="pipeline-summary-label">Churn</span>
            <strong>{metrics.churned}</strong>
          </div>
        </div>
      </Card>

      {filteredPipelines.length === 0 ? (
        <Card title="Pipeline board" subtitle="Contracts in the renewal window appear here automatically">
          <EmptyState
            title="No renewal pipelines yet"
            description="When a contract approaches its end date, a renewal pipeline will be created automatically."
          />
        </Card>
      ) : (
        filteredPipelines.map((pipeline) => {
          const stageMeta = getStageMeta(pipeline.currentStage);
          const remaining = daysUntil(pipeline.endDate);
          const budgetSummary = getContractBudgetSummary(pipeline);

          return (
            <Card
              key={pipeline.id}
              title={pipeline.customerName}
              subtitle={`${pipeline.contractName} · ${pipeline.team || "No team"} · Owner ${pipeline.owner}`}
            >
              <div className="pipeline-header-row">
                <div className="pipeline-badges">
                  <Badge tone={stageMeta.tone}>{stageMeta.label}</Badge>
                  <Badge tone={renewalTone[pipeline.renewalStatus] || "neutral"}>{pipeline.renewalStatus}</Badge>
                </div>
                <div className="pipeline-meta">
                  <span>{formatCurrency(pipeline.value, pipeline.currency)}</span>
                  <span>Renewed {formatCurrency(budgetSummary.renewedTotal, pipeline.currency)}</span>
                  <span>Renewal date {formatDate(pipeline.endDate)}</span>
                  <span className={remaining < 0 ? "text-danger" : ""}>
                    {remaining < 0 ? "Churn" : `${remaining} days left`}
                  </span>
                </div>
              </div>

              <ProcessStepper currentStep={pipeline.currentStage} steps={pipeline.steps} />

              <div className="pipeline-footer-row">
                <p className="muted">
                  {budgetSummary.deltaTotal !== 0
                    ? `Projected renewal delta ${budgetSummary.deltaTotal > 0 ? "+" : ""}${formatCurrency(
                        budgetSummary.deltaTotal,
                        pipeline.currency
                      )}`
                    : pipeline.notes || "No pipeline note added yet."}
                </p>
                <button className="btn btn-light" onClick={() => onNavigate(`/contracts/${pipeline.contractId}`)}>
                  Open contract
                </button>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
