import { useQuery } from "@tanstack/react-query";
import { DashboardPayload, mockDashboardData } from "@/features/dashboard/data/mock-data";

async function fetchDashboard(): Promise<DashboardPayload> {
  await new Promise((resolve) => setTimeout(resolve, 450));
  return mockDashboardData;
}

export function useDashboardQuery() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard
  });
}
