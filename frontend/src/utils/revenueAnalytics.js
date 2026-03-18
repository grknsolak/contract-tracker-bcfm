export const MRR_SCOPES = ["DaaS (Fix)", "7/24 Support", "Man/Day (Fix)", "Outsource"];
export const NRR_SCOPES = ["DaaS (T&M)", "Man/Day (T&M)", "Other"];

export const SCOPE_COLORS = {
  "DaaS (Fix)": "#2563eb",
  "7/24 Support": "#1c9c63",
  "Man/Day (Fix)": "#f59e0b",
  Outsource: "#7c3aed",
  "DaaS (T&M)": "#0f766e",
  "Man/Day (T&M)": "#ef4444",
  Other: "#7a8599",
};

function monthKey(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function getScopeType(scope) {
  if (MRR_SCOPES.includes(scope)) return "MRR";
  if (NRR_SCOPES.includes(scope)) return "NRR";
  return null;
}

function buildFallbackScopeHistory(contract) {
  const scopes = (contract.scopes || []).filter(Boolean);
  if (!scopes.length || !contract.value) return [];

  const totalValue = Number(contract.value || 0);
  const perScope = Math.round(totalValue / scopes.length);
  const baseDate = new Date(contract.startDate || Date.now());
  if (Number.isNaN(baseDate.getTime())) return [];

  return scopes.map((scope, scopeIndex) => ({
    name: scope,
    color: SCOPE_COLORS[scope],
    history: [-3, -2, -1, 0].map((offset, index) => {
      const date = new Date(baseDate.getFullYear(), baseDate.getMonth() + offset, 1);
      const multiplier = [0.84, 0.92, 1, 1][index];
      return {
        date: date.toISOString(),
        value: Math.round(perScope * multiplier),
      };
    }),
  }));
}

export function normalizeScopeSeries(contract) {
  if (contract.scopeValueHistory?.length) {
    return contract.scopeValueHistory;
  }
  return buildFallbackScopeHistory(contract);
}

export function buildRevenueAnalytics(contracts, selectedTeam = "All", range = {}) {
  const filteredContracts =
    selectedTeam === "All" ? contracts : contracts.filter((contract) => (contract.team || "") === selectedTeam);

  const monthlyMap = {};

  filteredContracts.forEach((contract) => {
    normalizeScopeSeries(contract).forEach((series) => {
      const scopeType = getScopeType(series.name);
      if (!scopeType) return;

      (series.history || []).forEach((point) => {
        const key = monthKey(point.date);
        if (!key) return;
        if (!monthlyMap[key]) {
          monthlyMap[key] = { key, MRR: {}, NRR: {} };
        }
        monthlyMap[key][scopeType][series.name] = (monthlyMap[key][scopeType][series.name] || 0) + Number(point.value || 0);
      });
    });
  });

  const months = Object.keys(monthlyMap).sort();

  const allMonthRows = months.map((key) => {
    const row = monthlyMap[key];
    const mrrTotal = Object.values(row.MRR).reduce((sum, value) => sum + value, 0);
    const nrrTotal = Object.values(row.NRR).reduce((sum, value) => sum + value, 0);
    return {
      key,
      label: monthLabel(key),
      mrr: row.MRR,
      nrr: row.NRR,
      mrrTotal,
      nrrTotal,
    };
  });

  const monthRows = allMonthRows.filter((row) => {
    if (range.startKey && row.key < range.startKey) return false;
    if (range.endKey && row.key > range.endKey) return false;
    return true;
  });

  const latestMonth = monthRows[monthRows.length - 1] || null;
  const latestYear = latestMonth ? latestMonth.key.slice(0, 4) : null;

  const monthly = {
    mrr: latestMonth?.mrrTotal || 0,
    nrr: latestMonth?.nrrTotal || 0,
  };

  const rangeTotal = {
    mrr: monthRows.reduce((sum, row) => sum + row.mrrTotal, 0),
    nrr: monthRows.reduce((sum, row) => sum + row.nrrTotal, 0),
  };

  const breakdown = {
    MRR: MRR_SCOPES.map((scope) => ({
      scope,
      value: monthRows.reduce((sum, row) => sum + (row.mrr?.[scope] || 0), 0),
      color: SCOPE_COLORS[scope],
    })),
    NRR: NRR_SCOPES.map((scope) => ({
      scope,
      value: monthRows.reduce((sum, row) => sum + (row.nrr?.[scope] || 0), 0),
      color: SCOPE_COLORS[scope],
    })),
  };

  const monthlyMRRSeries = monthRows.map((row) => ({
    label: row.label,
    total: row.mrrTotal,
    segments: MRR_SCOPES.map((scope) => ({
      label: scope,
      value: row.mrr?.[scope] || 0,
      color: SCOPE_COLORS[scope],
    })).filter((item) => item.value > 0),
  }));

  const monthlyNRRSeries = monthRows.map((row) => ({
    label: row.label,
    total: row.nrrTotal,
    segments: NRR_SCOPES.map((scope) => ({
      label: scope,
      value: row.nrr?.[scope] || 0,
      color: SCOPE_COLORS[scope],
    })).filter((item) => item.value > 0),
  }));

  return {
    months: monthRows,
    allMonths: allMonthRows,
    latestMonthKey: latestMonth?.key || null,
    latestMonthLabel: latestMonth?.label || "-",
    latestYear: latestYear || "-",
    monthly,
    rangeTotal,
    breakdown,
    monthlyMRRSeries,
    monthlyNRRSeries,
  };
}
