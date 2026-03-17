"use client";

import { useMemo, useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useContractsStore } from "@/features/contracts/context/contracts-store";
import { contractStages, scopeOptions } from "@/features/contracts/data/constants";
import { formatDate, getDurationLabel, isExpiringSoon, remainingDays, stageTone } from "@/features/contracts/utils/contracts";
import { ScopeTags } from "@/features/contracts/components/scope-tags";
import Link from "next/link";

const activityItems = [
  { id: "act-1", title: "Harbor Health renewal review scheduled", meta: "Renewal • Today" },
  { id: "act-2", title: "Northwind Logistics scope updated", meta: "Scope update • Yesterday" },
  { id: "act-3", title: "Pioneer Energy expired contract flagged", meta: "Expiration • 2 days ago" }
];

export default function DashboardPage() {
  const { contracts } = useContractsStore();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [scopeFilter, setScopeFilter] = useState("All");

  const metrics = useMemo(() => {
    const totalCustomers = new Set(contracts.map((item) => item.name)).size;
    const activeContracts = contracts.filter((item) => item.stage === "Active").length;
    const expiring30 = contracts.filter((item) => isExpiringSoon(remainingDays(item.endDate), 30)).length;
    const expiring60 = contracts.filter((item) => {
      const days = remainingDays(item.endDate);
      return days != null && days >= 31 && days <= 60;
    }).length;
    const expired = contracts.filter((item) => (remainingDays(item.endDate) ?? 0) < 0).length;
    return { totalCustomers, activeContracts, expiring30, expiring60, expired };
  }, [contracts]);

  const filteredContracts = useMemo(() => {
    return contracts.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.contractName.toLowerCase().includes(search.toLowerCase());
      const matchesStage = stageFilter === "All" || item.stage === stageFilter;
      const matchesScope = scopeFilter === "All" || item.scopes.includes(scopeFilter as never);
      return matchesSearch && matchesStage && matchesScope;
    });
  }, [contracts, search, stageFilter, scopeFilter]);

  const stageDistribution = useMemo(() => {
    return contractStages.map((stage) => ({
      stage,
      count: contracts.filter((item) => item.stage === stage).length
    }));
  }, [contracts]);

  const urgentContracts = useMemo(() => {
    return contracts.filter((item) => isExpiringSoon(remainingDays(item.endDate), 30) || item.stage === "Expired");
  }, [contracts]);

  return (
    <DashboardShell>
      <section className="space-y-6">
        <div>
          <h2 className="text-3xl font-semibold font-serif">Contract Overview</h2>
          <p className="text-muted-foreground mt-1">Track customer agreements, service scopes, and renewal urgency.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card>
            <CardHeader>
              <CardDescription>Total customers</CardDescription>
              <CardTitle className="text-3xl font-semibold">{metrics.totalCustomers}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Active contracts</CardDescription>
              <CardTitle className="text-3xl font-semibold">{metrics.activeContracts}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Expiring in 30 days</CardDescription>
              <CardTitle className="text-3xl font-semibold text-warning">{metrics.expiring30}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Expiring in 60 days</CardDescription>
              <CardTitle className="text-3xl font-semibold">{metrics.expiring60}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Expired contracts</CardDescription>
              <CardTitle className="text-3xl font-semibold text-danger">{metrics.expired}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader>
              <CardDescription>Quick filters</CardDescription>
              <CardTitle>Search & filter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
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
              </div>
              <div className="rounded-xl border border-dashed border-muted p-3 text-sm text-muted-foreground">
                {filteredContracts.length} contracts match your filters. Use Alerts for expiration-focused review.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Status distribution</CardDescription>
              <CardTitle>Contract stages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stageDistribution.map((item) => {
                const percentage = contracts.length ? Math.round((item.count / contracts.length) * 100) : 0;
                const tone = stageTone(item.stage);
                return (
                  <div key={item.stage} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{item.stage}</span>
                      <span className="text-muted-foreground">{item.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className={`h-2 rounded-full ${
                          tone === "success"
                            ? "bg-success"
                            : tone === "warning"
                            ? "bg-warning"
                            : tone === "danger"
                            ? "bg-danger"
                            : "bg-primary"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader>
              <CardDescription>Customers & scopes</CardDescription>
              <CardTitle>Scope coverage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredContracts.slice(0, 5).map((contract) => {
                const days = remainingDays(contract.endDate);
                return (
                  <div key={contract.id} className="flex flex-col gap-2 rounded-xl border border-muted bg-muted/30 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{contract.name}</div>
                        <div className="text-xs text-muted-foreground">{contract.contractName}</div>
                      </div>
                      <Badge variant={stageTone(contract.stage) as never}>{contract.stage}</Badge>
                    </div>
                    <ScopeTags scopes={contract.scopes} otherScopeText={contract.otherScopeText} />
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Duration: {getDurationLabel(contract.durationType)}</span>
                      <span>Remaining: {days == null ? "-" : days < 0 ? "Expired" : `${days} days`}</span>
                    </div>
                  </div>
                );
              })}
              <Link className="text-sm font-semibold text-primary" href="/customers">
                View full customer list
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Latest updates</CardDescription>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activityItems.map((item) => (
                <div key={item.id} className="rounded-xl border border-muted bg-muted/30 p-3">
                  <div className="text-sm font-semibold">{item.title}</div>
                  <div className="text-xs text-muted-foreground">{item.meta}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader>
              <CardDescription>Urgent renewal focus</CardDescription>
              <CardTitle>30-day renewals & expired</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {urgentContracts.slice(0, 4).map((contract) => {
                const days = remainingDays(contract.endDate);
                return (
                  <div key={contract.id} className="flex items-center justify-between rounded-xl border border-muted bg-muted/30 p-3">
                    <div>
                      <div className="text-sm font-semibold">{contract.name}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(contract.endDate)}</div>
                    </div>
                    <Badge variant={days != null && days < 0 ? "danger" : "warning"}>
                      {days != null && days < 0 ? "Expired" : `${days} days`}
                    </Badge>
                  </div>
                );
              })}
              <Link className="text-sm font-semibold text-primary" href="/alerts">
                Review expiration tracking
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Quick actions</CardDescription>
              <CardTitle>Workflow shortcuts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/customers">Add customer contract</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/alerts">Open renewal dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </DashboardShell>
  );
}
