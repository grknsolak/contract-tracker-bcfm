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
  const scopes = contract?.scopes || [];
  const scopePrices = getScopePrices(contract);
  const renewalRates = getRenewalRates(contract);

  return scopes.map((scope) => {
    const baseAmount = Number(scopePrices[scope] || 0);
    const renewalRate = Number(renewalRates[scope] || 0);
    const renewedAmount = getRenewedScopeAmount(baseAmount, renewalRate);
    return {
      scope,
      baseAmount,
      renewalRate,
      renewedAmount,
      deltaAmount: renewedAmount - baseAmount,
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
