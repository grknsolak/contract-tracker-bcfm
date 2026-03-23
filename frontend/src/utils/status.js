export const contractStages = [
  "NDA",
  "Draft",
  "Legal Review",
  "Signature",
  "Active",
  "Renewal Protocol",
  "Expired",
];

export const initialContractStages = [
  "NDA",
  "Draft",
  "Legal Review",
  "Signature",
  "Active",
  "Expired",
];

export const renewalContractStages = [
  "Active",
  "Draft",
  "Legal Review",
  "Signature",
  "Renewal Protocol",
  "Expired",
];

export const legacyStageMap = {
  "Under Review": "Legal Review",
  "Approval Pending": "Signature",
  Signed: "Signature",
  "Renewal Upcoming": "Renewal Protocol",
};

export const stageMeta = {
  NDA: { tone: "neutral", label: "NDA" },
  Draft: { tone: "info", label: "Draft" },
  "Legal Review": { tone: "warning", label: "Legal Review" },
  Signature: { tone: "primary", label: "Signature" },
  Active: { tone: "success", label: "Active" },
  "Renewal Protocol": { tone: "warning", label: "Renewal Protocol" },
  Expired: { tone: "danger", label: "Churn" },
};

export const stageColors = {
  NDA: "#94a3b8",
  Draft: "#64748b",
  "Legal Review": "#60a5fa",
  Signature: "#6366f1",
  Active: "#10b981",
  "Renewal Protocol": "#f59e0b",
  Expired: "#ef4444",
};

export const renewalTone = {
  "On Track": "success",
  Negotiation: "warning",
  "Needs Attention": "danger",
  Pending: "warning",
  Lost: "neutral",
};

export function normalizeStage(stage) {
  return legacyStageMap[stage] || stage || "NDA";
}

function normalizeHistoryLabels(history = []) {
  return history.map((item) => String(item.label || "").toLowerCase());
}

export function isRenewalContract(contract) {
  if (!contract) return false;

  const normalizedStage = normalizeStage(contract.stage);
  if (normalizedStage === "Renewal Protocol") return true;
  if (Boolean(contract.renewalStartedAt) || Boolean(contract.renewalClosedAt)) return true;

  const labels = normalizeHistoryLabels(contract.history);
  return labels.some((label) => label.includes("renewal") || label.includes("protocol"));
}

export function getContractStageFlow(contract) {
  return isRenewalContract(contract) ? renewalContractStages : initialContractStages;
}

export function getStageMeta(stage) {
  const normalized = normalizeStage(stage);
  return stageMeta[normalized] || { tone: "neutral", label: normalized || "Unknown" };
}
