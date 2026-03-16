import { create } from "zustand";

export type DateRange = "30d" | "90d" | "12m";

interface FilterState {
  dateRange: DateRange;
  search: string;
  status: "all" | "success" | "warning" | "danger";
  setDateRange: (value: DateRange) => void;
  setSearch: (value: string) => void;
  setStatus: (value: FilterState["status"]) => void;
}

export const useDashboardFilters = create<FilterState>((set) => ({
  dateRange: "90d",
  search: "",
  status: "all",
  setDateRange: (value) => set({ dateRange: value }),
  setSearch: (value) => set({ search: value }),
  setStatus: (value) => set({ status: value })
}));
