import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityItem } from "@/features/dashboard/data/mock-data";

export function ActivityTimeline({ items }: { items: ActivityItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3 rounded-lg border p-3">
            <div className="mt-1 size-2 rounded-full bg-primary" />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-sm">{item.title}</p>
                <Badge variant={item.status}>{item.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{item.detail}</p>
              <p className="text-xs text-muted-foreground">{item.time}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
