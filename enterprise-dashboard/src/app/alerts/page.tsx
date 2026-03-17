"use client";

import { useMemo, useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useContractsStore } from "@/features/contracts/context/contracts-store";
import { contractStages, scopeOptions } from "@/features/contracts/data/constants";
import { formatDate, remainingDays } from "@/features/contracts/utils/contracts";
import Link from "next/link";

function AlertSection({ title, description, items }: { title: string; description: string; items: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{description}</CardDescription>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-muted p-4 text-sm text-muted-foreground">
            No contracts in this category.
          </div>
        ) : (
          items.map((contract) => {
            const days = remainingDays(contract.endDate);
            return (
              <div key={contract.id} className="flex items-center justify-between rounded-xl border border-muted bg-muted/30 p-3">
                <div>
                  <div className="text-sm font-semibold">{contract.name}</div>
                  <div className="text-xs text-muted-foreground">{contract.contractName}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">{formatDate(contract.endDate)}</div>
                  <Badge variant={days != null && days < 0 ? "danger" : "warning"}>
                    {days != null && days < 0 ? "Expired" : `${days} days left`}
                  </Badge>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/contracts/${contract.id}`}>View</Link>
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export default function AlertsPage() {
  const { contracts } = useContractsStore();
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState("All");
  const [stageFilter, setStageFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("remaining");

  const filtered = useMemo(() => {
    return contracts
      .filter((item) => {
        const matchesSearch =
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.contractName.toLowerCase().includes(search.toLowerCase());
        const matchesScope = scopeFilter === "All" || item.scopes.includes(scopeFilter as never);
        const matchesStage = stageFilter === "All" || item.stage === stageFilter;
        const withinStart = startDate ? new Date(item.endDate) >= new Date(startDate) : true;
        const withinEnd = endDate ? new Date(item.endDate) <= new Date(endDate) : true;
        return matchesSearch && matchesScope && matchesStage && withinStart && withinEnd;
      })
      .sort((a, b) => {
        const daysA = remainingDays(a.endDate) ?? 99999;
        const daysB = remainingDays(b.endDate) ?? 99999;
        if (sortBy === "urgency") {
          const urgencyA = daysA < 0 ? -999 : daysA;
          const urgencyB = daysB < 0 ? -999 : daysB;
          return urgencyA - urgencyB;
        }
        return daysA - daysB;
      });
  }, [contracts, search, scopeFilter, stageFilter, startDate, endDate, sortBy]);

  const expiring30 = filtered.filter((item) => {
    const days = remainingDays(item.endDate);
    return days != null && days >= 0 && days <= 30;
  });
  const expiring60 = filtered.filter((item) => {
    const days = remainingDays(item.endDate);
    return days != null && days >= 31 && days <= 60;
  });
  const expired = filtered.filter((item) => (remainingDays(item.endDate) ?? 0) < 0);

  return (
    <DashboardShell>
      <section className="space-y-6">
        <div>
          <h2 className="text-3xl font-semibold font-serif">Expiration Tracking</h2>
          <p className="text-muted-foreground mt-1">Stay ahead of renewals and contract risks.</p>
        </div>

        <Card>
          <CardHeader>
            <CardDescription>Filters</CardDescription>
            <CardTitle>Refine expiration view</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Search</label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scope</label>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={scopeFilter}
                onChange={(e) => setScopeFilter(e.target.value)}
              >
                <option value="All">All scopes</option>
                {scopeOptions.map((scope) => (
                  <option key={scope} value={scope}>
                    {scope}
                  </option>
                ))}
              </select>
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
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">End date from</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">End date to</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sort by</label>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="remaining">Remaining days</option>
                <option value="urgency">Urgency</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          <AlertSection
            title="Expiring within 30 days"
            description="Immediate renewal focus"
            items={expiring30}
          />
          <AlertSection
            title="Expiring within 60 days"
            description="Upcoming renewals"
            items={expiring60}
          />
          <AlertSection title="Expired contracts" description="Follow-up required" items={expired} />
        </div>
      </section>
    </DashboardShell>
  );
}
