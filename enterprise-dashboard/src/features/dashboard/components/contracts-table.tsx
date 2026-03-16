"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContractRecord } from "@/features/dashboard/data/mock-data";
import { useDashboardFilters } from "@/features/dashboard/hooks/use-dashboard-filters";
import { formatCurrency } from "@/lib/utils";
import { EmptyState } from "@/features/dashboard/components/empty-state";

type SortKey = "company" | "mrr" | "renewalDate";

type SortDirection = "asc" | "desc";

export function ContractsTable({ items }: { items: ContractRecord[] }) {
  const { search, status } = useDashboardFilters();
  const [sortKey, setSortKey] = useState<SortKey>("renewalDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return items
      .filter((item) => (status === "all" ? true : item.status === status))
      .filter((item) => {
        if (!keyword) return true;
        return item.company.toLowerCase().includes(keyword) || item.owner.toLowerCase().includes(keyword);
      })
      .sort((a, b) => {
        const mult = sortDirection === "asc" ? 1 : -1;

        if (sortKey === "mrr") return (a.mrr - b.mrr) * mult;
        if (sortKey === "renewalDate") return (Date.parse(a.renewalDate) - Date.parse(b.renewalDate)) * mult;
        return a.company.localeCompare(b.company) * mult;
      });
  }, [items, search, status, sortDirection, sortKey]);

  const pageSize = 4;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection("asc");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contracts Overview</CardTitle>
      </CardHeader>
      <CardContent>
        {pageItems.length === 0 ? (
          <EmptyState label="No records match current filters." />
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">
                      <button className="inline-flex items-center gap-1" onClick={() => toggleSort("company")}>Company <ArrowUpDown className="size-3" /></button>
                    </th>
                    <th className="py-2 pr-4">Owner</th>
                    <th className="py-2 pr-4">
                      <button className="inline-flex items-center gap-1" onClick={() => toggleSort("mrr")}>MRR <ArrowUpDown className="size-3" /></button>
                    </th>
                    <th className="py-2 pr-4">
                      <button className="inline-flex items-center gap-1" onClick={() => toggleSort("renewalDate")}>Renewal <ArrowUpDown className="size-3" /></button>
                    </th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{item.company}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{item.owner}</td>
                      <td className="py-3 pr-4">{formatCurrency(item.mrr)}</td>
                      <td className="py-3 pr-4">{item.renewalDate}</td>
                      <td className="py-3"><Badge variant={item.status}>{item.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Page {safePage} / {pageCount}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Prev
                </Button>
                <Button variant="outline" size="sm" disabled={safePage >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
