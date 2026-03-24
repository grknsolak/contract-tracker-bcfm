/**
 * Customer tier classification — A+ / A / B / C
 * Based on a contract's value as a share of total portfolio value.
 *
 *  A+  ≥ 20 %  of total
 *  A   ≥ 10 %
 *  B   ≥  5 %
 *  C   <  5 %
 */

export const CUSTOMER_TIERS = [
  { label: "A+", minPct: 20, color: "#C4912A", bg: "rgba(196,145,42,0.12)",  border: "rgba(196,145,42,0.35)" },
  { label: "A",  minPct: 10, color: "#8E9BAD", bg: "rgba(142,155,173,0.10)", border: "rgba(142,155,173,0.35)" },
  { label: "B",  minPct:  5, color: "#6EE7B7", bg: "rgba(110,231,183,0.10)", border: "rgba(110,231,183,0.30)" },
  { label: "C",  minPct:  0, color: "#93C5FD", bg: "rgba(147,197,253,0.10)", border: "rgba(147,197,253,0.30)" },
];

/** Total USD-equivalent value across all contracts (TL contracts counted at face value) */
export function getTotalPortfolioValue(contracts) {
  return contracts.reduce((sum, c) => sum + Number(c.value || 0), 0);
}

/** Return the tier object for a single contract value vs total */
export function getCustomerTier(contractValue, totalValue) {
  if (!totalValue || !contractValue) return CUSTOMER_TIERS[CUSTOMER_TIERS.length - 1];
  const pct = (Number(contractValue) / totalValue) * 100;
  return CUSTOMER_TIERS.find((t) => pct >= t.minPct) ?? CUSTOMER_TIERS[CUSTOMER_TIERS.length - 1];
}

/** Convenience: pct share string like "12.4%" */
export function getTierSharePct(contractValue, totalValue) {
  if (!totalValue || !contractValue) return "0%";
  return `${((Number(contractValue) / totalValue) * 100).toFixed(1)}%`;
}
