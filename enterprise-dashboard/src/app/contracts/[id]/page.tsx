"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useContractsStore } from "@/features/contracts/context/contracts-store";
import { contractStages } from "@/features/contracts/data/constants";
import { formatDate, getDurationLabel, remainingDays, stageTone } from "@/features/contracts/utils/contracts";
import { ScopeTags } from "@/features/contracts/components/scope-tags";

export default function ContractDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { contracts } = useContractsStore();
  const contract = contracts.find((item) => item.id === id);

  const timeline = useMemo(() => {
    if (!contract) return [];
    const stageIndex = contractStages.findIndex((stage) => stage === contract.stage);
    return contractStages.slice(0, stageIndex + 1).map((stage, index) => ({
      stage,
      date: index === 0 ? contract.createdAt : contract.updatedAt
    }));
  }, [contract]);

  if (!contract) {
    return (
      <DashboardShell>
        <div className="rounded-2xl border bg-card p-8 text-center">
          <h2 className="text-xl font-semibold">Contract not found</h2>
          <p className="text-muted-foreground mt-2">Return to customers and select a contract.</p>
          <Button className="mt-4" onClick={() => router.push("/customers")}>
            Back to customers
          </Button>
        </div>
      </DashboardShell>
    );
  }

  const days = remainingDays(contract.endDate);

  return (
    <DashboardShell>
      <section className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customers / {contract.name}</p>
            <h2 className="text-3xl font-semibold font-serif">{contract.contractName}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={stageTone(contract.stage) as never}>{contract.stage}</Badge>
              <Badge variant="neutral">{contract.renewalStatus}</Badge>
              <span className={days != null && days < 0 ? "text-danger font-semibold" : "text-muted-foreground"}>
                {days == null ? "-" : days < 0 ? "Expired" : `${days} days remaining`}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => router.push("/customers")}>Back</Button>
            <Button onClick={() => router.push(`/customers`)}>Edit contract</Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader>
              <CardDescription>Customer information</CardDescription>
              <CardTitle>Account snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Customer name</span>
                <span className="font-semibold">{contract.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Contract start</span>
                <span className="font-semibold">{formatDate(contract.startDate)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Contract end</span>
                <span className="font-semibold">{formatDate(contract.endDate)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-semibold">{getDurationLabel(contract.durationType)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Renewal status</span>
                <span className="font-semibold">{contract.renewalStatus}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Service scopes</CardDescription>
              <CardTitle>Scope coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <ScopeTags scopes={contract.scopes} otherScopeText={contract.otherScopeText} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <Card>
            <CardHeader>
              <CardDescription>Contract timeline</CardDescription>
              <CardTitle>Status history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {timeline.map((item) => (
                <div key={item.stage} className="flex items-start gap-3">
                  <span className="mt-1 size-2 rounded-full bg-primary" />
                  <div>
                    <div className="text-sm font-semibold">{item.stage}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(item.date)}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Notes</CardDescription>
              <CardTitle>Context</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{contract.notes || "No notes recorded."}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardDescription>Stage progress</CardDescription>
            <CardTitle>Current lifecycle position</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {contractStages.map((stage) => (
              <div
                key={stage}
                className={`rounded-xl border p-3 ${stage === contract.stage ? "border-primary/40 bg-primary/5" : "border-muted"}`}
              >
                <div className="text-sm font-semibold">{stage}</div>
                <div className="text-xs text-muted-foreground">{stage === contract.stage ? "Current stage" : ""}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </DashboardShell>
  );
}
