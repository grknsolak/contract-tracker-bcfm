"use client";

import { motion } from "framer-motion";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useDashboardQuery } from "@/features/dashboard/hooks/use-dashboard-query";
import { FilterBar } from "@/features/dashboard/components/filter-bar";
import { KpiCards } from "@/features/dashboard/components/kpi-cards";
import { RevenueChart } from "@/features/dashboard/components/revenue-chart";
import { ActivityTimeline } from "@/features/dashboard/components/activity-timeline";
import { ContractsTable } from "@/features/dashboard/components/contracts-table";
import { LoadingState } from "@/features/dashboard/components/loading-state";
import { ErrorState } from "@/features/dashboard/components/error-state";

/**
 * App Router page keeps composition thin.
 * Data fetching and state management live in feature hooks for scalability.
 */
export default function DashboardPage() {
  const { data, isPending, isError, refetch } = useDashboardQuery();

  return (
    <DashboardShell>
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-4"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Executive Performance Dashboard</h1>
          <p className="text-muted-foreground mt-1">Real-time operational and revenue visibility for leadership teams.</p>
        </div>

        <FilterBar />

        {isPending && <LoadingState />}
        {isError && <ErrorState onRetry={() => refetch()} />}

        {data && (
          <div className="space-y-4">
            <KpiCards items={data.kpis} />
            <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
              <RevenueChart data={data.revenueSeries} />
              <ActivityTimeline items={data.activities} />
            </div>
            <ContractsTable items={data.contracts} />
          </div>
        )}
      </motion.section>
    </DashboardShell>
  );
}
