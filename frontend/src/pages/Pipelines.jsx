import React, { useMemo, useState } from "react";
import Card from "../components/Card";
import Badge from "../components/Badge";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import ProcessStepper from "../components/ProcessStepper";
import { daysUntil, formatCurrency, formatDate, formatRemainingDays } from "../utils/date";
import { getContractBudgetSummary } from "../utils/pricing";
import { getStageMeta, renewalTone } from "../utils/status";
import {
  buildRenewalPipelines,
  getNextRenewalStage,
  pipelineStages,
  RENEWAL_PIPELINE_WINDOW_DAYS,
} from "../utils/pipelines";

function addMonthsPreservingDate(dateValue, months) {
  const base = new Date(dateValue);
  if (Number.isNaN(base.getTime())) return "";
  base.setMonth(base.getMonth() + months);
  return base.toISOString().slice(0, 10);
}

function inferContractMonths(contract) {
  const start = new Date(contract.startDate);
  const end = new Date(contract.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 12;
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return months > 0 ? months : 12;
}

export default function Pipelines({ contracts, setContracts, onNavigate }) {
  const [stageFilter, setStageFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [confirmStep, setConfirmStep] = useState(null);

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

  const movePipelineForward = (pipeline) => {
    const nextStage = getNextRenewalStage(pipeline.currentStage);
    if (!nextStage) return;

    const today = new Date().toISOString();
    const stageLabel =
      nextStage === "Legal Review"
        ? "Legal review"
        : nextStage === "Renewal Protocol"
        ? "Renewal protocol"
        : nextStage;

    setContracts((prev) =>
      prev.map((contract) =>
        contract.id === pipeline.contractId
          ? {
              ...contract,
              renewalStartedAt: contract.renewalStartedAt || today,
              renewalPipelineStage: nextStage,
              renewalStatus: nextStage === "Renewal Protocol" ? "Negotiation" : contract.renewalStatus || "On Track",
              history: [...(contract.history || []), { date: today, label: stageLabel, actor: contract.owner }],
            }
          : contract
      )
    );
  };

  const completeRenewal = (pipeline) => {
    const today = new Date();
    const completedAt = today.toISOString();

    setContracts((prev) =>
      prev.map((contract) => {
        if (contract.id !== pipeline.contractId) return contract;

        const renewedValue = getContractBudgetSummary(contract).renewedTotal || contract.value;
        const renewedMonths = inferContractMonths(contract);
        const nextEndDate = addMonthsPreservingDate(contract.endDate, renewedMonths);

        return {
          ...contract,
          value: renewedValue,
          stage: "Active",
          renewalStatus: "On Track",
          endDate: nextEndDate || contract.endDate,
          renewalClosedAt: completedAt,
          renewalCompletedAt: completedAt,
          renewalStartedAt: null,
          renewalPipelineStage: null,
          history: [
            ...(contract.history || []),
            { date: completedAt, label: "Renewal signed", actor: contract.owner },
            { date: completedAt, label: "Active", actor: contract.owner },
          ],
        };
      })
    );
  };

  const confirmPipelineAdvance = () => {
    if (!confirmStep) return;

    if (confirmStep.currentStage === "Renewal Protocol") {
      completeRenewal(confirmStep);
    } else {
      movePipelineForward(confirmStep);
    }

    setConfirmStep(null);
  };

  return (
    <div className="page">
      <Card
        title="Renewal pipelines"
        subtitle={
          RENEWAL_PIPELINE_WINDOW_DAYS === 0
            ? "Contracts automatically enter this board when the active term ends or when a renewal is started manually."
            : `Contracts automatically enter this board ${RENEWAL_PIPELINE_WINDOW_DAYS} days before renewal.`
        }
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
                  <div className="pipeline-meta-item">
                    <span className="pipeline-meta-label">Owner</span>
                    <strong>{pipeline.owner}</strong>
                  </div>
                  <div className="pipeline-meta-item">
                    <span className="pipeline-meta-label">Current value</span>
                    <strong>{formatCurrency(pipeline.value, pipeline.currency)}</strong>
                  </div>
                  <div className="pipeline-meta-item">
                    <span className="pipeline-meta-label">Renewed value</span>
                    <strong>{formatCurrency(budgetSummary.renewedTotal, pipeline.currency)}</strong>
                  </div>
                  <div className="pipeline-meta-item">
                    <span className="pipeline-meta-label">Renewal date</span>
                    <strong>{formatDate(pipeline.endDate)}</strong>
                  </div>
                  <div className={`pipeline-meta-item ${remaining < 0 ? "is-alert" : ""}`}>
                    <span className="pipeline-meta-label">Timing</span>
                    <strong className={remaining < 0 ? "text-danger" : ""}>{formatRemainingDays(remaining)}</strong>
                  </div>
                </div>
              </div>

              <ProcessStepper
                currentStep={pipeline.currentStage}
                steps={pipeline.steps}
                onStepConfirm={(step) => {
                  if (step.id !== pipeline.currentStage) return;
                  setConfirmStep(pipeline);
                }}
              />

              <div className="pipeline-footer-row">
                <p className="muted">
                  {budgetSummary.deltaTotal !== 0
                    ? `Projected renewal delta ${budgetSummary.deltaTotal > 0 ? "+" : ""}${formatCurrency(
                        budgetSummary.deltaTotal,
                        pipeline.currency
                      )}`
                    : pipeline.notes || "No pipeline note added yet."}
                </p>
                <div className="pipeline-actions">
                  <button className="btn btn-light" onClick={() => onNavigate(`/contracts/${pipeline.contractId}`)}>
                    Open contract
                  </button>
                </div>
              </div>
            </Card>
          );
        })
      )}

      {confirmStep ? (
        <Modal
          title="Confirm stage update"
          description={
            confirmStep.currentStage === "Renewal Protocol"
              ? "This will mark the renewal as signed, reactivate the contract, and remove it from the pipeline board."
              : `This will move the pipeline from ${confirmStep.currentStage} to ${getNextRenewalStage(confirmStep.currentStage)}.`
          }
          onClose={() => setConfirmStep(null)}
          footer={
            <div className="modal-actions">
              <button className="btn btn-light" onClick={() => setConfirmStep(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={confirmPipelineAdvance}>
                Confirm
              </button>
            </div>
          }
        >
          <p>
            {confirmStep.currentStage === "Renewal Protocol"
              ? `Do you confirm that ${confirmStep.customerName} renewal has been signed?`
              : `Do you confirm advancing ${confirmStep.customerName} to ${getNextRenewalStage(confirmStep.currentStage)}?`}
          </p>
        </Modal>
      ) : null}
    </div>
  );
}
