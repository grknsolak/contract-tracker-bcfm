import React, { useEffect, useMemo, useState, useCallback } from "react";
import Card from "../components/Card";
import Badge from "../components/Badge";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import { toastSuccess, toastError, toastWarning } from "../components/Toast";
import { daysUntil, formatDate, formatMonthYear, formatCurrency } from "../utils/date";
import { calculateScopeTotal, getContractBudgetSummary, getRenewalRates, getScopePrices } from "../utils/pricing";
import {
  contractStages,
  getStageMeta,
  initialContractStages,
  isRenewalContract,
  normalizeStage,
  renewalContractStages,
  renewalTone,
} from "../utils/status";

const scopeOptions = [
  "DaaS (Fix)",
  "7/24 Support",
  "Outsource",
  "Man/Day (Fix)",
  "DaaS (T&M)",
  "Man/Day (T&M)",
  "Other",
];

const durationOptions = [
  { value: "6m", label: "6 Months", months: 6 },
  { value: "1y", label: "1 Year", months: 12 },
  { value: "3y", label: "3 Years", months: 36 },
];

const WIZARD_STEPS = [
  { key: "basics", label: "Basics" },
  { key: "details", label: "Details" },
  { key: "review", label: "Review" },
];

function addDuration(startDate, durationType) {
  if (!startDate || !durationType) return "";
  const option = durationOptions.find((item) => item.value === durationType);
  if (!option) return "";
  const date = new Date(startDate);
  if (Number.isNaN(date.getTime())) return "";
  date.setMonth(date.getMonth() + option.months);
  return date.toISOString().slice(0, 10);
}

function inferDurationType(startDate, endDate) {
  if (!startDate || !endDate) return "";
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (months === 6) return "6m";
  if (months === 12) return "1y";
  if (months === 36) return "3y";
  return "";
}

function getCurrencyPlaceholder(currency) {
  return currency === "TL" ? "TL" : "$";
}

const emptyForm = {
  customerName: "",
  contractName: "",
  owner: "",
  team: "",
  durationType: "",
  startDate: "",
  endDate: "",
  stage: "NDA",
  renewalStatus: "On Track",
  value: "",
  currency: "TL",
  usdRate: "",
  valueUsd: "",
  notes: "",
  scopes: [],
  scopePrices: {},
  renewalRates: {},
  otherScopeText: "",
};

function validateStep(step, formState) {
  const errors = {};
  if (step === "basics") {
    if (!formState.customerName.trim()) errors.customerName = "Customer name is required.";
    if (!formState.contractName.trim()) errors.contractName = "Contract name is required.";
    if (!formState.durationType) errors.durationType = "Select a contract duration.";
    if (!formState.startDate) errors.startDate = "Start date is required.";
    if (formState.scopes.length === 0) errors.scopes = "Select at least one service scope.";
    for (const scope of formState.scopes) {
      const price = formState.scopePrices?.[scope];
      if (price === "" || price == null || Number(price) <= 0) {
        errors[`scope_${scope}`] = `Enter a valid budget for ${scope}.`;
      }
    }
  }
  return errors;
}

function FieldError({ error }) {
  if (!error) return null;
  return <div className="field-error-message">{error}</div>;
}

export default function Customers({ contracts, setContracts, onNavigate, route }) {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [sortBy, setSortBy] = useState("recent");
  const [sortDir, setSortDir] = useState("desc");
  const [formState, setFormState] = useState(emptyForm);
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [returnToContract, setReturnToContract] = useState(null);
  const teamOptions = ["Team A", "Team B", "Atlas", "Apex", "Solid", "Mando"];

  const getStageOptionsForForm = (draft) => {
    const normalizedCustomer = String(draft.customerName || "").trim().toLowerCase();
    const hasPreviousContract = contracts.some(
      (contract) => contract.id !== editingId && contract.customerName.trim().toLowerCase() === normalizedCustomer
    );

    if (hasPreviousContract || isRenewalContract(draft)) {
      return renewalContractStages;
    }

    return initialContractStages;
  };

  const isRenewalFlowForForm = (draft) => getStageOptionsForForm(draft) === renewalContractStages;

  useEffect(() => {
    setSearch(route?.query?.q || "");
  }, [route?.query?.q]);

  useEffect(() => {
    if (!isModalOpen) return;
    if (!formState.startDate || !formState.durationType) return;
    const nextEndDate = addDuration(formState.startDate, formState.durationType);
    if (nextEndDate && nextEndDate !== formState.endDate) {
      setFormState((prev) => ({ ...prev, endDate: nextEndDate }));
    }
  }, [formState.startDate, formState.durationType, formState.endDate, isModalOpen]);

  React.useEffect(() => {
    const editId = route?.query?.edit;
    if (!editId) return;
    const contract = contracts.find((item) => item.id === editId);
    if (contract) {
      setReturnToContract(editId);
      openEdit(contract);
    }
  }, [route, contracts]);

  useEffect(() => {
    if (!isModalOpen) return;
    const nextStageOptions = getStageOptionsForForm(formState);
    if (!nextStageOptions.includes(formState.stage)) {
      setFormState((prev) => ({ ...prev, stage: nextStageOptions[0] }));
    }
  }, [formState, isModalOpen]);

  const filtered = useMemo(() => {
    const normalized = search.toLowerCase();
    const list = contracts.filter((contract) => {
      const matchesSearch =
        contract.customerName.toLowerCase().includes(normalized) ||
        contract.contractName.toLowerCase().includes(normalized) ||
        (contract.contractType || "").toLowerCase().includes(normalized) ||
        contract.owner.toLowerCase().includes(normalized);
      const matchesStage = stageFilter === "All" || normalizeStage(contract.stage) === stageFilter;
      return matchesSearch && matchesStage;
    });

    const sorted = [...list].sort((a, b) => {
      let valueA;
      let valueB;
      switch (sortBy) {
        case "recent":
          valueA = new Date(a.createdAt || 0).getTime() || 0;
          valueB = new Date(b.createdAt || 0).getTime() || 0;
          break;
        case "customer":
          valueA = a.customerName;
          valueB = b.customerName;
          break;
        case "endDate":
          valueA = new Date(a.endDate).getTime();
          valueB = new Date(b.endDate).getTime();
          break;
        case "status":
          valueA = a.stage;
          valueB = b.stage;
          break;
        default:
          valueA = daysUntil(a.endDate) ?? 99999;
          valueB = daysUntil(b.endDate) ?? 99999;
      }
      if (valueA < valueB) return sortDir === "asc" ? -1 : 1;
      if (valueA > valueB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [contracts, search, stageFilter, sortBy, sortDir]);

  const openNew = () => {
    setEditingId(null);
    setFormState(emptyForm);
    setFieldErrors({});
    setWizardStep(0);
    setReturnToContract(null);
    setModalOpen(true);
  };

  const openEdit = (contract) => {
    setEditingId(contract.id);
    setFormState({
      ...contract,
      value: contract.value ?? "",
      currency: contract.currency || "USD",
      team: contract.team || "",
      durationType: contract.durationType || inferDurationType(contract.startDate, contract.endDate),
      stage: normalizeStage(contract.stage),
      scopes: contract.scopes || [],
      scopePrices: getScopePrices(contract),
      renewalRates: getRenewalRates(contract),
      otherScopeText: contract.otherScopeText || "",
    });
    setFieldErrors({});
    setWizardStep(0);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (returnToContract) {
      onNavigate(`/contracts/${returnToContract}`);
      setReturnToContract(null);
    }
    setModalOpen(false);
    setFormState(emptyForm);
    setEditingId(null);
    setFieldErrors({});
    setWizardStep(0);
  };

  const goToStep = (stepIndex) => {
    if (stepIndex < wizardStep) {
      setWizardStep(stepIndex);
      return;
    }
    for (let i = wizardStep; i < stepIndex; i++) {
      const errors = validateStep(WIZARD_STEPS[i].key, formState);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setWizardStep(i);
        return;
      }
    }
    setFieldErrors({});
    setWizardStep(stepIndex);
  };

  const handleNext = () => {
    const currentKey = WIZARD_STEPS[wizardStep].key;
    const errors = validateStep(currentKey, formState);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setWizardStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
  };

  const handleBack = () => {
    setFieldErrors({});
    setWizardStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSave = () => {
    for (let i = 0; i < WIZARD_STEPS.length - 1; i++) {
      const errors = validateStep(WIZARD_STEPS[i].key, formState);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setWizardStep(i);
        toastError("Please fix the validation errors before saving.");
        return;
      }
    }

    setSaving(true);
    const totalValue = calculateScopeTotal(formState.scopePrices);
    const usdRate = parseFloat(formState.usdRate);
    const valueUsd = formState.currency === "TL" && usdRate > 0
      ? Math.round(totalValue / usdRate)
      : formState.currency === "USD" ? totalValue : null;

    try {
      if (editingId) {
        setContracts((prev) =>
          prev.map((contract) =>
            contract.id === editingId
              ? { ...contract, ...formState, value: totalValue, valueUsd, updatedAt: new Date().toISOString() }
              : contract
          )
        );
        toastSuccess(`${formState.contractName} updated successfully.`, "Contract updated");
      } else {
        const stageOptions = getStageOptionsForForm(formState);
        const normalizedStage = stageOptions.includes(formState.stage) ? formState.stage : stageOptions[0];
        const isRenewalFlow = stageOptions === renewalContractStages;
        const newContract = {
          ...formState,
          stage: normalizedStage,
          value: totalValue,
          valueUsd,
          id: `ct-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          history:
            isRenewalFlow
              ? [{ date: formState.startDate, label: normalizedStage }]
              : normalizedStage === "NDA"
              ? [{ date: formState.startDate, label: "NDA completed" }]
              : [
                  { date: formState.startDate, label: "NDA completed" },
                  { date: formState.startDate, label: normalizedStage },
                ],
        };
        setContracts((prev) => [newContract, ...prev]);
        toastSuccess(`${formState.contractName} created successfully.`, "Contract created");
      }

      if (returnToContract) {
        onNavigate(`/contracts/${returnToContract}`);
        setReturnToContract(null);
      }

      setModalOpen(false);
      setFormState(emptyForm);
      setEditingId(null);
      setFieldErrors({});
      setWizardStep(0);
    } catch {
      toastError("An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  const stageOptions = getStageOptionsForForm(formState);
  const isRenewalFlow = isRenewalFlowForForm(formState);
  const scopeBudgetTotal = calculateScopeTotal(formState.scopePrices);
  const renewalBudgetSummary = getContractBudgetSummary(formState);
  const currencyPlaceholder = getCurrencyPlaceholder(formState.currency);

  const handleDelete = (id) => {
    setDeleting(id);
    try {
      setContracts((prev) => prev.filter((contract) => contract.id !== id));
      toastSuccess("Contract deleted successfully.", "Deleted");
    } catch {
      toastError("Failed to delete contract.");
    } finally {
      setConfirmDelete(null);
      setDeleting(null);
    }
  };

  const clearFieldError = useCallback((fieldName) => {
    setFieldErrors((prev) => {
      if (!prev[fieldName]) return prev;
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  }, []);

  const renderWizardSteps = () => (
    <div className="wizard-steps">
      {WIZARD_STEPS.map((step, index) => {
        const isCompleted = index < wizardStep;
        const isActive = index === wizardStep;
        return (
          <React.Fragment key={step.key}>
            {index > 0 && <div className={`wizard-connector ${isCompleted ? "completed" : ""}`} />}
            <button
              type="button"
              className={`wizard-step ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`}
              onClick={() => goToStep(index)}
            >
              <span className="wizard-step-number">{isCompleted ? "✓" : index + 1}</span>
              {step.label}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );

  const renderBasicsStep = () => (
    <div className="form-grid">
      <div className={`field ${fieldErrors.customerName ? "field-error" : ""}`}>
        <label>Customer name *</label>
        <input
          value={formState.customerName}
          onChange={(e) => { setFormState({ ...formState, customerName: e.target.value }); clearFieldError("customerName"); }}
          placeholder="Enter customer name"
        />
        <FieldError error={fieldErrors.customerName} />
      </div>
      <div className={`field ${fieldErrors.contractName ? "field-error" : ""}`}>
        <label>Contract name *</label>
        <input
          value={formState.contractName}
          onChange={(e) => { setFormState({ ...formState, contractName: e.target.value }); clearFieldError("contractName"); }}
          placeholder="Enter contract name"
        />
        <FieldError error={fieldErrors.contractName} />
      </div>
      <div className={`field ${fieldErrors.durationType ? "field-error" : ""}`}>
        <label>Contract duration *</label>
        <select
          value={formState.durationType}
          onChange={(e) => { setFormState({ ...formState, durationType: e.target.value }); clearFieldError("durationType"); }}
        >
          <option value="">Select duration</option>
          {durationOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <FieldError error={fieldErrors.durationType} />
      </div>
      <div className="field">
        <label>Owner</label>
        <input
          value={formState.owner}
          onChange={(e) => setFormState({ ...formState, owner: e.target.value })}
          placeholder="Contract owner"
        />
      </div>
      <div className={`field ${fieldErrors.startDate ? "field-error" : ""}`}>
        <label>Start date *</label>
        <input
          type="date"
          value={formState.startDate}
          onChange={(e) => { setFormState({ ...formState, startDate: e.target.value }); clearFieldError("startDate"); }}
        />
        <FieldError error={fieldErrors.startDate} />
      </div>
      <div className="field">
        <label>End date (automatic)</label>
        <input
          type="date"
          value={formState.endDate}
          onChange={(e) => setFormState({ ...formState, endDate: e.target.value })}
          readOnly={Boolean(formState.startDate && formState.durationType)}
        />
      </div>
      <div className={`field field-span-2 ${fieldErrors.scopes ? "field-error" : ""}`}>
        <div className="scope-inline-header">
          <label>Service scopes *</label>
          <div className="scope-inline-header-right">
            <div className="scope-currency-toggle">
              {["TL", "USD"].map((cur) => (
                <label key={cur} className={`scope-currency-option ${formState.currency === cur ? "active" : ""}`}>
                  <input type="radio" value={cur} checked={formState.currency === cur} onChange={() => setFormState({ ...formState, currency: cur })} />
                  {cur}
                </label>
              ))}
            </div>
            {formState.currency === "TL" && formState.scopes.length > 0 && (
              <div className="usd-rate-wrap">
                <span className="usd-rate-label">1 USD =</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="usd-rate-input"
                  value={formState.usdRate}
                  placeholder="Kur (TL)"
                  onChange={(e) => setFormState({ ...formState, usdRate: e.target.value })}
                />
                <span className="usd-rate-label">TL</span>
              </div>
            )}
          </div>
        </div>
        <div className="scope-inline-list">
          {scopeOptions.map((scope) => {
            const on = formState.scopes.includes(scope);
            return (
              <div key={scope} className={`scope-inline-row ${on ? "active" : ""}`}>
                <label className="scope-inline-label">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => {
                      const nextScopes = on ? formState.scopes.filter((s) => s !== scope) : [...formState.scopes, scope];
                      const nextPrices = { ...(formState.scopePrices || {}) };
                      const nextRates = { ...(formState.renewalRates || {}) };
                      if (on) { delete nextPrices[scope]; delete nextRates[scope]; }
                      else if (nextPrices[scope] == null) { nextPrices[scope] = ""; nextRates[scope] = 0; }
                      setFormState({ ...formState, scopes: nextScopes, scopePrices: nextPrices, renewalRates: nextRates, otherScopeText: scope === "Other" && on ? "" : formState.otherScopeText });
                      clearFieldError("scopes");
                    }}
                  />
                  <span className="scope-name">{scope}</span>
                </label>
                {on && (
                  <div className={`scope-inline-price-wrap ${fieldErrors[`scope_${scope}`] ? "field-error" : ""}`}>
                    <span className="scope-currency-badge">{formState.currency}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formState.scopePrices?.[scope] ?? ""}
                      placeholder="Budget"
                      onChange={(e) => { setFormState((prev) => ({ ...prev, scopePrices: { ...(prev.scopePrices || {}), [scope]: e.target.value } })); clearFieldError(`scope_${scope}`); }}
                    />
                    <FieldError error={fieldErrors[`scope_${scope}`]} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <FieldError error={fieldErrors.scopes} />
      </div>
    </div>
  );

  const renderScopesStep = () => (
    <div className="form-grid">
      {formState.scopes.length === 0 ? (
        <div className="field field-span-2">
          <p className="muted" style={{ margin: 0 }}>No scopes selected. Go back to Basics to select service scopes and set budgets.</p>
        </div>
      ) : (
        <div className="field field-span-2">
          <label>Renewal rates (%) per scope</label>
          <div className="form-grid" style={{ marginTop: 8 }}>
            {formState.scopes.map((scope) => (
              <div className="field" key={scope}>
                <label>{scope === "Other" && formState.otherScopeText ? formState.otherScopeText : scope} renewal %</label>
                <input
                  type="number"
                  step="0.01"
                  value={formState.renewalRates?.[scope] ?? 0}
                  onChange={(e) => setFormState((prev) => ({ ...prev, renewalRates: { ...(prev.renewalRates || {}), [scope]: e.target.value } }))}
                  placeholder="%"
                />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 20, fontSize: 14, padding: "10px 14px", background: "var(--surface-2)", borderRadius: 10 }}>
            <span><strong>Total budget:</strong> {formatCurrency(scopeBudgetTotal, formState.currency)}</span>
            {renewalBudgetSummary.renewedTotal > 0 && (
              <span><strong>Renewed:</strong> {formatCurrency(renewalBudgetSummary.renewedTotal, formState.currency)}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderDetailsStep = () => (
    <div className="form-grid">
      <div className="field">
        <label>Team</label>
        <select
          value={formState.team}
          onChange={(e) => setFormState({ ...formState, team: e.target.value })}
        >
          <option value="">Select team</option>
          {teamOptions.map((team) => (
            <option key={team} value={team}>{team}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Stage</label>
        <select
          value={formState.stage}
          onChange={(e) => setFormState({ ...formState, stage: e.target.value })}
        >
          {stageOptions.map((stage) => (
            <option key={stage}>{stage}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Renewal status</label>
        <select
          value={formState.renewalStatus}
          onChange={(e) => setFormState({ ...formState, renewalStatus: e.target.value })}
        >
          <option>On Track</option>
          <option>Negotiation</option>
          <option>Needs Attention</option>
          <option>Pending</option>
          <option>Lost</option>
        </select>
      </div>
      <div className="field field-span-2">
        <label>Flow</label>
        <div className="muted" style={{ fontSize: 13 }}>
          {isRenewalFlow
            ? "Renewal flow detected. NDA is skipped and the process starts from the active contract."
            : "Initial contract flow. NDA is required before draft and legal review."}
        </div>
      </div>
      <div className="field field-span-2">
        <label>Notes</label>
        <textarea
          rows="3"
          value={formState.notes}
          onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
          placeholder="Additional notes about this contract..."
        />
      </div>
    </div>
  );

  const renderReviewStep = () => {
    const totalValue = calculateScopeTotal(formState.scopePrices);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="scope-breakdown-item">
            <div>
              <div className="muted" style={{ fontSize: 12 }}>Customer</div>
              <div style={{ fontWeight: 700 }}>{formState.customerName}</div>
            </div>
          </div>
          <div className="scope-breakdown-item">
            <div>
              <div className="muted" style={{ fontSize: 12 }}>Contract</div>
              <div style={{ fontWeight: 700 }}>{formState.contractName}</div>
            </div>
          </div>
          <div className="scope-breakdown-item">
            <div>
              <div className="muted" style={{ fontSize: 12 }}>Duration</div>
              <div style={{ fontWeight: 700 }}>
                {durationOptions.find((d) => d.value === formState.durationType)?.label || formState.durationType}
              </div>
            </div>
          </div>
          <div className="scope-breakdown-item">
            <div>
              <div className="muted" style={{ fontSize: 12 }}>Period</div>
              <div style={{ fontWeight: 700 }}>{formState.startDate} → {formState.endDate}</div>
            </div>
          </div>
          <div className="scope-breakdown-item">
            <div>
              <div className="muted" style={{ fontSize: 12 }}>Owner</div>
              <div style={{ fontWeight: 700 }}>{formState.owner || "-"}</div>
            </div>
          </div>
          <div className="scope-breakdown-item">
            <div>
              <div className="muted" style={{ fontSize: 12 }}>Team</div>
              <div style={{ fontWeight: 700 }}>{formState.team || "-"}</div>
            </div>
          </div>
        </div>

        <Card title="Scopes & Budget">
          <div className="scope-breakdown-list">
            {formState.scopes.map((scope) => {
              const price = formState.scopePrices?.[scope] || 0;
              const rate = formState.renewalRates?.[scope] || 0;
              return (
                <div key={scope} className="scope-breakdown-item">
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {scope === "Other" && formState.otherScopeText ? formState.otherScopeText : scope}
                    </div>
                    {Number(rate) !== 0 && <div className="muted" style={{ fontSize: 12 }}>Renewal: {rate}%</div>}
                  </div>
                  <div style={{ fontWeight: 700 }}>{formatCurrency(price, formState.currency)}</div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 16, fontWeight: 700, fontSize: 15 }}>
            <span>Total: {formatCurrency(totalValue, formState.currency)}</span>
          </div>
        </Card>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Badge tone={getStageMeta(formState.stage).tone}>{formState.stage}</Badge>
          <Badge tone={renewalTone[formState.renewalStatus] || "neutral"}>{formState.renewalStatus}</Badge>
          {isRenewalFlow && <Badge tone="info">Renewal flow</Badge>}
        </div>

        {formState.notes && (
          <div className="muted" style={{ fontSize: 13, padding: "8px 0" }}>{formState.notes}</div>
        )}
      </div>
    );
  };

  return (
    <div className="page">
      <Card>
        <div className="filters">
          <div className="field">
            <label>Search</label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Customer, contract, owner, or type"
            />
          </div>
          <div className="field">
            <label>Stage</label>
            <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}>
              <option value="All">All stages</option>
              {contractStages.map((stage) => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Sort by</label>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="recent">Newest first</option>
              <option value="remaining">Remaining days</option>
              <option value="endDate">End date</option>
              <option value="customer">Customer name</option>
              <option value="status">Stage</option>
            </select>
          </div>
          <div className="field">
            <label>Order</label>
            <select value={sortDir} onChange={(event) => setSortDir(event.target.value)}>
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
          <div className="filter-actions">
            <button className="btn btn-primary" onClick={openNew}>Add customer</button>
          </div>
        </div>

        <div className="table">
          <div className="table-head">
            <div>Customer</div>
            <div>Contract</div>
            <div>Team</div>
            <div>Start</div>
            <div>End</div>
            <div>Remaining days</div>
            <div>Value</div>
            <div>Scopes</div>
            <div>Stage</div>
            <div>Renewal</div>
            <div>Actions</div>
          </div>
          <div className="table-body">
            {filtered.length === 0 ? (
              <EmptyState
                title="No customer records"
                description="Create a contract to start tracking customers."
                action={<button className="btn btn-primary" onClick={openNew}>Create contract</button>}
              />
            ) : (
              filtered.map((contract) => {
                const meta = getStageMeta(contract.stage);
                const remaining = daysUntil(contract.endDate);
                const budgetSummary = getContractBudgetSummary(contract);
                return (
                  <div key={contract.id} className="table-row">
                    <div className="clickable" onClick={() => onNavigate(`/contracts/${contract.id}`)}>
                      <div className="primary-text">{contract.customerName}</div>
                      <div className="muted">Owner: {contract.owner}</div>
                    </div>
                    <div>{contract.contractName}</div>
                    <div>{contract.team || "-"}</div>
                    <div>{formatMonthYear(contract.startDate)}</div>
                    <div>{formatMonthYear(contract.endDate)}</div>
                    <div className={remaining < 0 ? "text-danger" : ""}>
                      {remaining < 0 ? "Churn" : `${remaining} days`}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{formatCurrency(contract.value, contract.currency)}</div>
                      {contract.currency === "TL" && contract.valueUsd != null && (
                        <div className="muted" style={{ fontSize: 12 }}>≈ {formatCurrency(contract.valueUsd, "USD")}</div>
                      )}
                      {budgetSummary.deltaTotal !== 0 ? (
                        <div className={budgetSummary.deltaTotal > 0 ? "text-success" : "text-danger"} style={{ fontSize: 12 }}>
                          Renewal {budgetSummary.deltaTotal > 0 ? "+" : ""}
                          {formatCurrency(budgetSummary.deltaTotal, contract.currency)}
                        </div>
                      ) : null}
                    </div>
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
                    <div>
                      <Badge tone={renewalTone[contract.renewalStatus] || "neutral"}>
                        {contract.renewalStatus}
                      </Badge>
                    </div>
                    <div className="row-actions">
                      <button className="btn btn-ghost" onClick={() => openEdit(contract)}>Edit</button>
                      <button className="btn btn-ghost danger" onClick={() => setConfirmDelete(contract)}>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Card>

      {isModalOpen && (
        <Modal
          title={editingId ? "Edit contract" : "Create contract"}
          onClose={closeModal}
          footer={
            <div className="wizard-footer">
              <div className="wizard-footer-left">
                {wizardStep > 0 && (
                  <button className="btn btn-light" onClick={handleBack}>Back</button>
                )}
                <button className="btn btn-light" onClick={closeModal}>Cancel</button>
              </div>
              {wizardStep < WIZARD_STEPS.length - 1 ? (
                <button className="btn btn-primary" onClick={handleNext}>
                  Continue
                </button>
              ) : (
                <button
                  className={`btn btn-primary ${saving ? "btn-loading-inline" : ""}`}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving && <span className="spinner-sm" />}
                  {editingId ? "Save changes" : "Create contract"}
                </button>
              )}
            </div>
          }
        >
          {renderWizardSteps()}
          {wizardStep === 0 && renderBasicsStep()}
          {wizardStep === 1 && renderDetailsStep()}
          {wizardStep === 2 && renderReviewStep()}
        </Modal>
      )}

      {confirmDelete && (
        <Modal
          title="Delete contract"
          description="This action removes the contract and associated customer record."
          onClose={() => setConfirmDelete(null)}
          footer={
            <div className="modal-actions">
              <button className="btn btn-light" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button
                className={`btn btn-danger ${deleting ? "btn-loading-inline" : ""}`}
                onClick={() => handleDelete(confirmDelete.id)}
                disabled={Boolean(deleting)}
              >
                {deleting && <span className="spinner-sm" />}
                Confirm delete
              </button>
            </div>
          }
        >
          <p>
            You are about to delete <strong>{confirmDelete.customerName}</strong> ({confirmDelete.contractName}).
            This cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}
