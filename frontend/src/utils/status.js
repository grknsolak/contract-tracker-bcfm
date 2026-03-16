export const stageMeta = {
  Draft: { tone: "neutral", label: "Draft" },
  "Under Review": { tone: "info", label: "Under Review" },
  "Approval Pending": { tone: "warning", label: "Approval Pending" },
  Signed: { tone: "primary", label: "Signed" },
  Active: { tone: "success", label: "Active" },
  "Renewal Upcoming": { tone: "warning", label: "Renewal Upcoming" },
  Expired: { tone: "danger", label: "Expired" },
};

export const renewalTone = {
  "On Track": "success",
  Negotiation: "warning",
  "Needs Attention": "danger",
  Pending: "warning",
  Lost: "neutral",
};

export function getStageMeta(stage) {
  return stageMeta[stage] || { tone: "neutral", label: stage || "Unknown" };
}
