"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { durationOptions, contractStages, renewalStatusOptions, type ContractStage, type DurationType, type ServiceScope } from "@/features/contracts/data/constants";
import { addDuration, remainingDays } from "@/features/contracts/utils/contracts";
import { ScopeMultiSelect } from "@/features/contracts/components/scope-multi-select";

interface ContractFormState {
  name: string;
  contractName: string;
  startDate: string;
  durationType: DurationType;
  endDate: string;
  stage: ContractStage;
  renewalStatus: string;
  scopes: ServiceScope[];
  otherScopeText: string;
  notes: string;
}

interface ContractFormModalProps {
  open: boolean;
  initialValues?: Partial<ContractFormState> & { id?: string };
  onClose: () => void;
  onSubmit: (values: ContractFormState) => void;
}

const emptyState: ContractFormState = {
  name: "",
  contractName: "",
  startDate: "",
  durationType: "1y",
  endDate: "",
  stage: "Draft",
  renewalStatus: "On Track",
  scopes: [],
  otherScopeText: "",
  notes: ""
};

export function ContractFormModal({ open, initialValues, onClose, onSubmit }: ContractFormModalProps) {
  const [form, setForm] = useState<ContractFormState>(emptyState);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm({ ...emptyState, ...initialValues } as ContractFormState);
      setError("");
    }
  }, [open, initialValues]);

  useEffect(() => {
    if (!form.startDate || !form.durationType) return;
    const computed = addDuration(form.startDate, form.durationType);
    setForm((prev) => ({ ...prev, endDate: computed }));
  }, [form.startDate, form.durationType]);

  const remaining = useMemo(() => remainingDays(form.endDate), [form.endDate]);

  const submit = () => {
    if (!form.name || !form.contractName || !form.startDate || !form.endDate) {
      setError("Please complete all required fields.");
      return;
    }
    onSubmit(form);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-card p-6 shadow-soft">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold">{initialValues?.id ? "Edit customer" : "Add new customer"}</h2>
            <p className="text-sm text-muted-foreground">Contract end date is calculated automatically based on duration.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            ×
          </Button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer name</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contract name</label>
            <Input value={form.contractName} onChange={(e) => setForm({ ...form, contractName: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Start date</label>
            <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Duration</label>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={form.durationType}
              onChange={(e) => setForm({ ...form, durationType: e.target.value as DurationType })}
            >
              {durationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">End date</label>
            <Input type="date" value={form.endDate} readOnly />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stage</label>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={form.stage}
              onChange={(e) => setForm({ ...form, stage: e.target.value as ContractStage })}
            >
              {contractStages.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Renewal status</label>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={form.renewalStatus}
              onChange={(e) => setForm({ ...form, renewalStatus: e.target.value })}
            >
              {renewalStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Service scopes</label>
            <ScopeMultiSelect value={form.scopes} onChange={(scopes) => setForm({ ...form, scopes })} />
            {form.scopes.includes("Other") && (
              <Input
                placeholder="Other scope details"
                value={form.otherScopeText}
                onChange={(e) => setForm({ ...form, otherScopeText: e.target.value })}
              />
            )}
          </div>
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</label>
            <textarea
              className="min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <div className="rounded-xl border border-dashed border-muted p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Remaining days</span>
                <Badge variant={remaining != null && remaining < 0 ? "danger" : "neutral"}>
                  {remaining == null ? "-" : remaining < 0 ? "Expired" : `${remaining} days`}
                </Badge>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">End date updates automatically when duration changes.</div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          {error ? <span className="text-xs font-semibold text-danger mr-auto">{error}</span> : null}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>{initialValues?.id ? "Save changes" : "Create customer"}</Button>
        </div>
      </div>
    </div>
  );
}
