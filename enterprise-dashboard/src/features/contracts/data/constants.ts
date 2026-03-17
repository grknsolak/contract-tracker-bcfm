export const contractStages = [
  "Draft",
  "Under Review",
  "Approval Pending",
  "Signed",
  "Active",
  "Renewal Upcoming",
  "Expired"
] as const;

export type ContractStage = (typeof contractStages)[number];

export const durationOptions = [
  { value: "6m", label: "6 months", months: 6 },
  { value: "1y", label: "1 year", months: 12 },
  { value: "3y", label: "3 years", months: 36 }
] as const;

export type DurationType = (typeof durationOptions)[number]["value"];

export const scopeOptions = [
  "DaaS (Fix)",
  "7/24 Support",
  "Outsource",
  "Man/Day (Fix)",
  "DaaS (T&M)",
  "Man/Day (T&M)",
  "Other"
] as const;

export type ServiceScope = (typeof scopeOptions)[number];

export const renewalStatusOptions = ["On Track", "Negotiation", "Needs Attention", "Pending", "Lost"] as const;
export type RenewalStatus = (typeof renewalStatusOptions)[number];
