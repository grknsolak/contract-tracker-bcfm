import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ContractRecord } from "@/features/contracts/data/types";
import { formatDate, getDurationLabel, remainingDays } from "@/features/contracts/utils/contracts";
import { ScopeTags } from "@/features/contracts/components/scope-tags";
import { StatusBadge } from "@/features/contracts/components/status-badge";
import Link from "next/link";

interface ContractsTableProps {
  items: ContractRecord[];
  onEdit: (contract: ContractRecord) => void;
  onDelete: (contract: ContractRecord) => void;
}

export function ContractsTable({ items, onEdit, onDelete }: ContractsTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <div className="grid grid-cols-[2fr_1.4fr_1fr_1fr_1fr_1fr_1.4fr_0.8fr] gap-3 border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Customer</span>
        <span>Contract</span>
        <span>Start</span>
        <span>Duration</span>
        <span>End</span>
        <span>Remaining</span>
        <span>Stage</span>
        <span>Actions</span>
      </div>
      <div className="divide-y">
        {items.map((contract) => {
          const days = remainingDays(contract.endDate);
          return (
            <div key={contract.id} className="grid grid-cols-[2fr_1.4fr_1fr_1fr_1fr_1fr_1.4fr_0.8fr] gap-3 px-4 py-4 text-sm">
              <div className="space-y-1">
                <Link className="font-semibold text-foreground hover:text-primary" href={`/contracts/${contract.id}`}>
                  {contract.name}
                </Link>
                <ScopeTags scopes={contract.scopes} otherScopeText={contract.otherScopeText} />
              </div>
              <div className="text-muted-foreground">{contract.contractName}</div>
              <div>{formatDate(contract.startDate)}</div>
              <Badge variant="neutral">{getDurationLabel(contract.durationType)}</Badge>
              <div>{formatDate(contract.endDate)}</div>
              <div className={days != null && days < 0 ? "text-danger font-semibold" : ""}>
                {days == null ? "-" : days < 0 ? "Expired" : `${days} days`}
              </div>
              <div className="space-y-2">
                <StatusBadge stage={contract.stage} />
                <div>
                  <Badge variant="neutral" className="bg-muted/60 text-muted-foreground">
                    {contract.renewalStatus}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="ghost" size="sm" onClick={() => onEdit(contract)}>
                  Edit
                </Button>
                <Button variant="ghost" size="sm" className="text-danger" onClick={() => onDelete(contract)}>
                  Delete
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
