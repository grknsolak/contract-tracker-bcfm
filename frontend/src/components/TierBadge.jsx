import React from "react";
import { getCustomerTier, getTierSharePct } from "../utils/customerTier";

/**
 * TierBadge — shows A+ / A / B / C with a colored dot.
 *
 * Props:
 *   contractValue  — this contract's value (number)
 *   totalValue     — total portfolio value (number)
 *   showPct        — optionally show share pct in tooltip (default true)
 *   size           — "sm" | "md" (default "md")
 */
export default function TierBadge({ contractValue, totalValue, showPct = true, size = "md" }) {
  const tier = getCustomerTier(contractValue, totalValue);
  const pct  = showPct ? getTierSharePct(contractValue, totalValue) : null;

  return (
    <span
      className={`tier-badge tier-badge--${size}`}
      style={{ color: tier.color, background: tier.bg, borderColor: tier.border }}
      title={pct ? `Portfolio share: ${pct}` : undefined}
    >
      <span className="tier-badge-dot" style={{ background: tier.color }} />
      {tier.label}
    </span>
  );
}
