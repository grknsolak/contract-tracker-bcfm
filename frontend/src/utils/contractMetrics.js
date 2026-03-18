function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function diffInDays(startValue, endValue) {
  const start = parseDate(startValue);
  const end = parseDate(endValue);
  if (!start || !end) return null;
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

function findHistoryDate(history = [], matcher) {
  const match = history.find((item) => matcher((item.label || "").toLowerCase()));
  return match?.date || null;
}

export function getLifecycleDates(contract) {
  const history = contract.history || [];
  const draftCreatedAt =
    contract.draftCreatedAt ||
    findHistoryDate(history, (label) => label.includes("draft")) ||
    contract.startDate;
  const signedAt =
    contract.signedAt ||
    findHistoryDate(history, (label) => label.includes("signed"));
  const activeAt =
    contract.activeAt ||
    findHistoryDate(history, (label) => label.includes("active"));
  const renewalStartedAt =
    contract.renewalStartedAt ||
    findHistoryDate(history, (label) => label.includes("renewal"));
  const renewalClosedAt = contract.renewalClosedAt || null;

  return {
    draftCreatedAt,
    signedAt,
    activeAt,
    renewalStartedAt,
    renewalClosedAt,
  };
}

export function getContractOperationalMetrics(contract) {
  const { draftCreatedAt, signedAt, activeAt, renewalStartedAt, renewalClosedAt } = getLifecycleDates(contract);
  const salesCycleDays = diffInDays(draftCreatedAt, signedAt);
  const closureDays = diffInDays(draftCreatedAt, activeAt || signedAt);
  const renewalDays = diffInDays(renewalStartedAt, renewalClosedAt);
  const overdueActions = (contract.actions || []).filter((action) => {
    const due = parseDate(action.dueDate);
    if (!due) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return due < today && action.status !== "done";
  });

  return {
    salesCycleDays,
    closureDays,
    renewalDays,
    overdueActions,
  };
}

function average(values) {
  const valid = values.filter((value) => typeof value === "number" && Number.isFinite(value));
  if (!valid.length) return null;
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

export function getPortfolioOperationalMetrics(contracts) {
  const metrics = contracts.map(getContractOperationalMetrics);
  return {
    averageRenewalDays: average(metrics.map((item) => item.renewalDays)),
    averageSalesCycleDays: average(metrics.map((item) => item.salesCycleDays)),
    averageClosureDays: average(metrics.map((item) => item.closureDays)),
    overdueActionsCount: metrics.reduce((sum, item) => sum + item.overdueActions.length, 0),
  };
}
