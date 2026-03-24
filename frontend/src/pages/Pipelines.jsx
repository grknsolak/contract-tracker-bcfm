import React, { useMemo, useState } from "react";
import Card from "../components/Card";
import Badge from "../components/Badge";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import ProcessStepper from "../components/ProcessStepper";
import { daysUntil, formatCurrency, formatDate, formatRemainingDays } from "../utils/date";
import { getContractBudgetSummary, getRenewalRates, getRenewedScopeAmount } from "../utils/pricing";
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
  const [pendingRates, setPendingRates] = useState({});
  const [ratesModal, setRatesModal] = useState(null); // pipeline object

  const saveRenewalRates = (contractId, rates) => {
    setContracts((prev) =>
      prev.map((c) =>
        c.id === contractId ? { ...c, renewalRates: { ...c.renewalRates, ...rates } } : c
      )
    );
    setPendingRates((prev) => { const next = { ...prev }; delete next[contractId]; return next; });
  };

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

              {pipeline.currentStage === "Signature" && pipeline.scopes?.length > 0 && (
                <div className="pipeline-rates-trigger-row">
                  <button
                    className="btn btn-primary btn-sm btn-with-icon"
                    onClick={() => {
                      setPendingRates((prev) => ({
                        ...prev,
                        [pipeline.contractId]: prev[pipeline.contractId] ?? getRenewalRates(pipeline),
                      }));
                      setRatesModal(pipeline);
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                    Zam Oranlarını Gir
                  </button>
                  {(() => {
                    const saved = getRenewalRates(pipeline);
                    const hasRates = pipeline.scopes.some((s) => Number(saved[s]) > 0);
                    if (!hasRates) return null;
                    return (
                      <span className="pipeline-rates-saved-hint">
                        ✓ Oranlar kaydedildi · {formatCurrency(getContractBudgetSummary(pipeline).renewedTotal, pipeline.currency)} yenileme değeri
                      </span>
                    );
                  })()}
                </div>
              )}

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

      {/* ── Renewal Rates Modal ── */}
      {ratesModal && (() => {
        const pipeline = ratesModal;
        const saved = getRenewalRates(pipeline);
        const local = pendingRates[pipeline.contractId] ?? saved;
        const total = pipeline.scopes.reduce((sum, scope) => {
          const base = Number(pipeline.scopePrices?.[scope] || 0);
          const rate = Number(local[scope] ?? 0);
          return sum + getRenewedScopeAmount(base, rate);
        }, 0);

        return (
          <Modal
            title="Zam Oranları — İmza Aşaması"
            description={`${pipeline.customerName} · ${pipeline.contractName}`}
            onClose={() => setRatesModal(null)}
            footer={
              <div className="modal-actions">
                <button className="btn btn-light" onClick={() => setRatesModal(null)}>İptal</button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    saveRenewalRates(pipeline.contractId, local);
                    setRatesModal(null);
                  }}
                >
                  Kaydet
                </button>
              </div>
            }
          >
            <div className="rates-modal-body">
              <div className="rates-modal-grid">
                {pipeline.scopes.map((scope) => {
                  const base = Number(pipeline.scopePrices?.[scope] || 0);
                  const rate = Number(local[scope] ?? 0);
                  const renewed = getRenewedScopeAmount(base, rate);
                  return (
                    <div key={scope} className="rates-modal-row">
                      <div className="rates-modal-scope">
                        <span className="rates-modal-scope-name">{scope}</span>
                        {base > 0 && (
                          <span className="rates-modal-base">{formatCurrency(base, pipeline.currency)}</span>
                        )}
                      </div>
                      <div className="rates-modal-input-wrap">
                        <input
                          type="number"
                          className="rates-modal-input"
                          value={local[scope] ?? ""}
                          placeholder="0"
                          step="0.5"
                          min="0"
                          onChange={(e) =>
                            setPendingRates((prev) => ({
                              ...prev,
                              [pipeline.contractId]: {
                                ...(prev[pipeline.contractId] ?? saved),
                                [scope]: e.target.value,
                              },
                            }))
                          }
                        />
                        <span className="rates-modal-pct">%</span>
                      </div>
                      {base > 0 && rate > 0 && (
                        <div className="rates-modal-result">
                          <span className="rates-modal-arrow">→</span>
                          <span className="rates-modal-renewed">{formatCurrency(renewed, pipeline.currency)}</span>
                          <span className="rates-modal-delta">+{formatCurrency(renewed - base, pipeline.currency)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {total > 0 && (
                <div className="rates-modal-total">
                  <span>Toplam yenileme değeri</span>
                  <strong>{formatCurrency(total, pipeline.currency)}</strong>
                </div>
              )}
            </div>
          </Modal>
        );
      })()}

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
