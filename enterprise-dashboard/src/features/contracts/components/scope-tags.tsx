import { Badge } from "@/components/ui/badge";

interface ScopeTagsProps {
  scopes: string[];
  otherScopeText?: string;
}

export function ScopeTags({ scopes, otherScopeText }: ScopeTagsProps) {
  if (!scopes.length) {
    return <span className="text-xs text-muted-foreground">No scopes selected</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {scopes.map((scope) => (
        <Badge key={scope} variant="neutral" className="bg-muted/60 text-foreground">
          {scope}
        </Badge>
      ))}
      {otherScopeText ? (
        <Badge variant="neutral" className="bg-muted/60 text-foreground">
          {otherScopeText}
        </Badge>
      ) : null}
    </div>
  );
}
