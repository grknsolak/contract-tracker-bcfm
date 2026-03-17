import { scopeOptions, type ServiceScope } from "@/features/contracts/data/constants";

interface ScopeMultiSelectProps {
  value: ServiceScope[];
  onChange: (next: ServiceScope[]) => void;
}

export function ScopeMultiSelect({ value, onChange }: ScopeMultiSelectProps) {
  const toggle = (scope: ServiceScope) => {
    if (value.includes(scope)) {
      onChange(value.filter((item) => item !== scope));
      return;
    }
    onChange([...value, scope]);
  };

  return (
    <div className="grid gap-2">
      {scopeOptions.map((scope) => (
        <label key={scope} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.includes(scope)}
            onChange={() => toggle(scope)}
            className="size-4 rounded border-muted text-primary"
          />
          {scope}
        </label>
      ))}
    </div>
  );
}
