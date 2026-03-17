import { Badge } from "@/components/ui/badge";
import type { ContractStage } from "@/features/contracts/data/constants";
import { stageTone } from "@/features/contracts/utils/contracts";

export function StatusBadge({ stage }: { stage: ContractStage }) {
  const tone = stageTone(stage);
  return <Badge variant={tone as "success" | "warning" | "danger" | "primary" | "info" | "neutral"}>{stage}</Badge>;
}
