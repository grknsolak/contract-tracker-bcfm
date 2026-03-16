import { Inbox } from "lucide-react";

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground space-y-2">
      <Inbox className="size-6 mx-auto" />
      <p>{label}</p>
    </div>
  );
}
