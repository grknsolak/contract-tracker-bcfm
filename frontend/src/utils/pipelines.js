import { daysUntil, formatDate } from "./date";
import { getContractStageFlow, normalizeStage, renewalContractStages } from "./status";

export const pipelineStages = renewalContractStages;

export const RENEWAL_PIPELINE_WINDOW_DAYS = 0;
export const ACTIVE_RENEWAL_STAGES = ["Draft", "Legal Review", "Signature", "Renewal Protocol"];

function normalizeLabel(label) {
  return String(label || "").trim().toLowerCase();
}

function stageMatches(label, stage) {
  const normalizedLabel = normalizeLabel(label);
  const normalizedStage = normalizeLabel(stage);

  if (normalizedStage === "nda") return normalizedLabel.includes("nda");
  if (normalizedStage === "draft") return normalizedLabel.includes("draft");
  if (normalizedStage === "legal review") return normalizedLabel.includes("legal") || normalizedLabel.includes("under review");
  if (normalizedStage === "signature") {
    return (
      normalizedLabel.includes("signature") ||
      normalizedLabel.includes("sign") ||
      normalizedLabel.includes("approval pending")
    );
  }
  if (normalizedStage === "active") return normalizedLabel.includes("active");
  if (normalizedStage === "renewal protocol") {
    return normalizedLabel.includes("renewal") || normalizedLabel.includes("protocol");
  }
  if (normalizedStage === "expired") return normalizedLabel.includes("expired");

  return normalizedLabel.includes(normalizedStage);
}

function getStageEntry(contract, stage) {
  const history = contract.history || [];
  const match = history.find((entry) => stageMatches(entry.label, stage));
  if (match) return match;

  if (stage === "NDA" && history.length > 0) {
    return history
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  }

  return null;
}

export function shouldCreateRenewalPipeline(contract) {
  const remainingDays = daysUntil(contract.endDate);
  if (remainingDays == null) return false;
  if (contract.renewalCompletedAt) return false;

  return (
    remainingDays <= RENEWAL_PIPELINE_WINDOW_DAYS ||
    Boolean(contract.renewalPipelineStage) ||
    normalizeStage(contract.stage) === "Renewal Protocol" ||
    normalizeStage(contract.stage) === "Expired" ||
    Boolean(contract.renewalStartedAt)
  );
}

export function getRenewalCurrentStage(contract) {
  const explicitStage = contract.renewalPipelineStage;
  if (ACTIVE_RENEWAL_STAGES.includes(explicitStage)) return explicitStage;

  const normalizedStage = normalizeStage(contract.stage);
  if (ACTIVE_RENEWAL_STAGES.includes(normalizedStage)) return normalizedStage;

  if (shouldCreateRenewalPipeline(contract)) return "Draft";
  return "Active";
}

export function getNextRenewalStage(stage) {
  const currentIndex = ACTIVE_RENEWAL_STAGES.indexOf(stage);
  if (currentIndex < 0) return ACTIVE_RENEWAL_STAGES[0];
  return ACTIVE_RENEWAL_STAGES[currentIndex + 1] || null;
}

export function buildPipelineSteps(contract) {
  const stageFlow = getContractStageFlow(contract);

  return stageFlow.map((stage) => {
    const entry = getStageEntry(contract, stage);
    return {
      id: stage,
      name: stage,
      date: entry?.date ? formatDate(entry.date) : "",
      updatedBy: entry?.actor || contract.owner || "",
    };
  });
}

export function buildRenewalPipelineSteps(contract) {
  return renewalContractStages.map((stage) => {
    const entry =
      getStageEntry(contract, stage) ||
      (stage === "Draft" && contract.renewalStartedAt
        ? { date: contract.renewalStartedAt, actor: contract.owner }
        : null);
    return {
      id: stage,
      name: stage,
      date: entry?.date ? formatDate(entry.date) : "",
      updatedBy: entry?.actor || contract.owner || "",
    };
  });
}

export function buildRenewalPipelines(contracts = []) {
  return contracts
    .filter(shouldCreateRenewalPipeline)
    .map((contract) => {
      const remainingDays = daysUntil(contract.endDate);
      const currentStage = getRenewalCurrentStage(contract);

      return {
        id: `pipeline-${contract.id}`,
        contractId: contract.id,
        customerName: contract.customerName,
        contractName: contract.contractName,
        owner: contract.owner,
        team: contract.team,
        value: contract.value,
        currency: contract.currency,
        scopes: contract.scopes || [],
        scopePrices: contract.scopePrices || {},
        renewalRates: contract.renewalRates || {},
        otherScopeText: contract.otherScopeText || "",
        endDate: contract.endDate,
        remainingDays,
        startedAt: contract.renewalStartedAt || contract.endDate,
        currentStage,
        renewalStatus: contract.renewalStatus,
        notes: contract.notes,
        steps: buildRenewalPipelineSteps(contract),
      };
    })
    .sort((a, b) => {
      const left = typeof a.remainingDays === "number" ? a.remainingDays : Number.POSITIVE_INFINITY;
      const right = typeof b.remainingDays === "number" ? b.remainingDays : Number.POSITIVE_INFINITY;
      return left - right;
    });
}
