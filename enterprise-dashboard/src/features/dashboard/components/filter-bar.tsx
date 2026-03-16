"use client";

import { Input } from "@/components/ui/input";
import { useDashboardFilters } from "@/features/dashboard/hooks/use-dashboard-filters";

export function FilterBar() {
  const { dateRange, setDateRange, status, setStatus, search, setSearch } = useDashboardFilters();

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-muted-foreground" htmlFor="date-range">
          Date range
        </label>
        <select
          id="date-range"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
        >
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="12m">Last 12 months</option>
        </select>

        <label className="text-sm text-muted-foreground" htmlFor="status-filter">
          Status
        </label>
        <select
          id="status-filter"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
        >
          <option value="all">All</option>
          <option value="success">Healthy</option>
          <option value="warning">At Risk</option>
          <option value="danger">Critical</option>
        </select>
      </div>

      <div className="w-full md:w-72">
        <Input
          placeholder="Filter company or owner"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Filter table"
        />
      </div>
    </div>
  );
}
