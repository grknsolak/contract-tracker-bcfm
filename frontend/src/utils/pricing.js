export function getScopePrices(contract) {
  if (contract?.scopePrices && typeof contract.scopePrices === "object") return contract.scopePrices;
  return {};
}

export function getRenewalRates(contract) {
  if (contract?.renewalRates && typeof contract.renewalRates === "object") return contract.renewalRates;
  return {};
}

export function calculateScopeTotal(scopePrices = {}) {
  return Object.values(scopePrices).reduce((sum, value) => {
    const amount = Number(value || 0);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);
}

export function getRenewedScopeAmount(baseAmount, renewalRate) {
  const base = Number(baseAmount || 0);
  const rate = Number(renewalRate || 0);
  return Math.round(base * (1 + rate / 100));
}

export function buildScopeBudgetRows(contract) {
  const scopes        = contract?.scopes || [];
  const scopePrices   = getScopePrices(contract);
  const renewalRates  = getRenewalRates(contract);
  const svh           = contract?.scopeValueHistory || [];

  return scopes.map((scope) => {
    const baseAmount  = Number(scopePrices[scope] || 0);
    const renewalRate = Number(renewalRates[scope] || 0);
    const renewedAmount = getRenewedScopeAmount(baseAmount, renewalRate);

    // Resolve prev / curr from scopeValueHistory
    const entry   = svh.find((e) => e.name === scope);
    const history = entry?.history
      ? [...entry.history].sort((a, b) => new Date(a.date) - new Date(b.date))
      : [];

    const prevYearAmount = history.length >= 2
      ? Number(history[0].value)
      : baseAmount;

    const currYearAmount = history.length >= 1
      ? Number(history[history.length - 1].value)
      : renewedAmount;

    const pctChange = prevYearAmount > 0
      ? Math.round(((currYearAmount - prevYearAmount) / prevYearAmount) * 100)
      : renewalRate;

    const trend = currYearAmount > prevYearAmount ? "up"
                : currYearAmount < prevYearAmount ? "down"
                : "neutral";

    return {
      scope,
      baseAmount,
      renewalRate,
      renewedAmount,
      deltaAmount: renewedAmount - baseAmount,
      prevYearAmount,
      currYearAmount,
      pctChange,
      trend,
      hasHistory: history.length > 0,
    };
  });
}

export function getContractBudgetSummary(contract) {
  const rows = buildScopeBudgetRows(contract);
  const baseTotal = rows.reduce((sum, row) => sum + row.baseAmount, 0);
  const renewedTotal = rows.reduce((sum, row) => sum + row.renewedAmount, 0);

  return {
    rows,
    baseTotal,
    renewedTotal,
    deltaTotal: renewedTotal - baseTotal,
  };
}
