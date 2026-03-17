"use client";

import { useMemo, useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useContractsStore } from "@/features/contracts/context/contracts-store";
import { contractStages } from "@/features/contracts/data/constants";
import type { ContractRecord } from "@/features/contracts/data/types";
import { remainingDays } from "@/features/contracts/utils/contracts";
import { ContractsTable } from "@/features/contracts/components/contracts-table";
import { ContractFormModal } from "@/features/contracts/components/contract-form-modal";

export default function CustomersPage() {
  const { contracts, addContract, updateContract, removeContract } = useContractsStore();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [sortBy, setSortBy] = useState("remaining");
  const [sortDir, setSortDir] = useState("asc");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ContractRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ContractRecord | null>(null);

  const filtered = useMemo(() => {
    const list = contracts.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.contractName.toLowerCase().includes(search.toLowerCase());
      const matchesStage = stageFilter === "All" || item.stage === stageFilter;
      return matchesSearch && matchesStage;
    });

    const sorted = [...list].sort((a, b) => {
      let valueA: string | number = "";
      let valueB: string | number = "";
      if (sortBy === "customer") {
        valueA = a.name;
        valueB = b.name;
      } else if (sortBy === "endDate") {
        valueA = new Date(a.endDate).getTime();
        valueB = new Date(b.endDate).getTime();
      } else if (sortBy === "status") {
        valueA = a.stage;
        valueB = b.stage;
      } else {
        valueA = remainingDays(a.endDate) ?? 99999;
        valueB = remainingDays(b.endDate) ?? 99999;
      }

      if (valueA < valueB) return sortDir === "asc" ? -1 : 1;
      if (valueA > valueB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [contracts, search, stageFilter, sortBy, sortDir]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (contract: ContractRecord) => {
    setEditing(contract);
    setModalOpen(true);
  };

  const submit = (values: any) => {
    if (editing) {
      updateContract({ ...editing, ...values, updatedAt: new Date().toISOString().slice(0, 10), endDate: values.endDate });
    } else {
      addContract(values);
    }
    setModalOpen(false);
  };

  return (
    <DashboardShell>
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold font-serif">Customers</h2>
            <p className="text-muted-foreground mt-1">Manage contracts, stages, and service scopes in one view.</p>
          </div>
          <Button onClick={openCreate}>Add customer</Button>
        </div>

        <Card>
          <CardHeader>
            <CardDescription>Filters</CardDescription>
            <CardTitle>Find customer contracts quickly</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Search</label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Customer or contract" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stage</label>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
              >
                <option value="All">All stages</option>
                {contractStages.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sort by</label>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="remaining">Remaining days</option>
                <option value="endDate">End date</option>
                <option value="customer">Customer name</option>
                <option value="status">Stage</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Order</label>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value)}
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <ContractsTable items={filtered} onEdit={openEdit} onDelete={(contract) => setConfirmDelete(contract)} />
      </section>

      <ContractFormModal
        open={modalOpen}
        initialValues={editing ?? undefined}
        onClose={() => setModalOpen(false)}
        onSubmit={submit}
      />

      {confirmDelete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-soft">
            <h3 className="text-lg font-semibold">Delete contract</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This will remove {confirmDelete.name} ({confirmDelete.contractName}). This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button
                className="bg-danger text-white hover:bg-danger/90"
                onClick={() => {
                  removeContract(confirmDelete.id);
                  setConfirmDelete(null);
                }}
              >
                Confirm delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
