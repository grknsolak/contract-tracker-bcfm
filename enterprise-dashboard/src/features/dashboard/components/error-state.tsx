import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-danger/30 bg-danger/10 p-8 text-center space-y-3">
      <AlertTriangle className="mx-auto size-6 text-danger" />
      <p className="font-medium">Dashboard data could not be loaded.</p>
      <Button variant="outline" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
