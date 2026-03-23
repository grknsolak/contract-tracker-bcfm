export function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function formatMonthYear(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
  });
}

export function formatDateTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function daysUntil(iso) {
  if (!iso) return null;
  const end = new Date(iso);
  if (Number.isNaN(end.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end - today) / (1000 * 60 * 60 * 24));
}

export function formatRemainingDays(iso, options = {}) {
  const days = typeof iso === "number" ? iso : daysUntil(iso);
  if (days == null) return "-";

  const remainingSuffix = options.remainingSuffix || "days left";
  const overdueSuffix = options.overdueSuffix || "days overdue";

  if (days < 0) {
    return `${Math.abs(days)} ${overdueSuffix}`;
  }

  return `${days} ${remainingSuffix}`;
}

export function isExpired(iso) {
  const days = daysUntil(iso);
  return typeof days === "number" && days < 0;
}

export function formatCurrency(value, currency = "USD") {
  if (value == null || Number.isNaN(Number(value))) return "-";
  const normalized = currency === "TL" ? "TRY" : currency;
  return Number(value).toLocaleString("en-US", {
    style: "currency",
    currency: normalized,
    maximumFractionDigits: 0,
  });
}
