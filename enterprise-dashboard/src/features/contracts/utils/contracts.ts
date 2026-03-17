import { durationOptions, type DurationType, type ContractStage } from "@/features/contracts/data/constants";

export function formatDate(iso: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

export function addDuration(startDate: string, durationType: DurationType) {
  if (!startDate || !durationType) return "";
  const option = durationOptions.find((item) => item.value === durationType);
  if (!option) return "";
  const date = new Date(startDate);
  if (Number.isNaN(date.getTime())) return "";
  date.setMonth(date.getMonth() + option.months);
  return date.toISOString().slice(0, 10);
}

export function remainingDays(endDate: string) {
  if (!endDate) return null;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function stageTone(stage: ContractStage) {
  switch (stage) {
    case "Active":
      return "success";
    case "Renewal Upcoming":
    case "Approval Pending":
      return "warning";
    case "Expired":
      return "danger";
    case "Signed":
      return "primary";
    case "Under Review":
      return "info";
    default:
      return "neutral";
  }
}

export function getDurationLabel(durationType: DurationType) {
  return durationOptions.find((item) => item.value === durationType)?.label ?? "-";
}

export function isExpiringSoon(days: number | null, max: number) {
  if (days == null) return false;
  return days >= 0 && days <= max;
}
