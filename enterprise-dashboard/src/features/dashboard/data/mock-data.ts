export type Status = "success" | "warning" | "danger";

export interface KpiItem {
  id: string;
  label: string;
  value: number;
  delta: number;
  suffix?: string;
}

export interface RevenuePoint {
  month: string;
  revenue: number;
  forecast: number;
}

export interface ActivityItem {
  id: string;
  title: string;
  detail: string;
  time: string;
  status: Status;
}

export interface ContractRecord {
  id: string;
  company: string;
  owner: string;
  mrr: number;
  renewalDate: string;
  status: Status;
}

export interface DashboardPayload {
  kpis: KpiItem[];
  revenueSeries: RevenuePoint[];
  activities: ActivityItem[];
  contracts: ContractRecord[];
}

export const mockDashboardData: DashboardPayload = {
  kpis: [
    { id: "arr", label: "ARR", value: 12400000, delta: 14.2, suffix: "$" },
    { id: "nrr", label: "NRR", value: 118, delta: 3.1, suffix: "%" },
    { id: "churn", label: "Churn", value: 2.8, delta: -0.5, suffix: "%" },
    { id: "pipeline", label: "Pipeline", value: 3400000, delta: 8.4, suffix: "$" }
  ],
  revenueSeries: [
    { month: "Jan", revenue: 840, forecast: 820 },
    { month: "Feb", revenue: 920, forecast: 900 },
    { month: "Mar", revenue: 980, forecast: 960 },
    { month: "Apr", revenue: 1030, forecast: 1000 },
    { month: "May", revenue: 1110, forecast: 1060 },
    { month: "Jun", revenue: 1210, forecast: 1140 }
  ],
  activities: [
    {
      id: "a1",
      title: "Enterprise renewal completed",
      detail: "Northwind • 3-year contract signed",
      time: "2h ago",
      status: "success"
    },
    {
      id: "a2",
      title: "Risk flagged",
      detail: "Globex account health dropped below threshold",
      time: "5h ago",
      status: "warning"
    },
    {
      id: "a3",
      title: "Escalation",
      detail: "Initech invoice dispute requires CFO review",
      time: "1d ago",
      status: "danger"
    }
  ],
  contracts: [
    { id: "c1", company: "Northwind", owner: "E. Stone", mrr: 88000, renewalDate: "2026-04-20", status: "success" },
    { id: "c2", company: "Globex", owner: "M. Clark", mrr: 56000, renewalDate: "2026-03-12", status: "warning" },
    { id: "c3", company: "Initech", owner: "A. Khan", mrr: 41000, renewalDate: "2026-02-25", status: "danger" },
    { id: "c4", company: "Umbrella", owner: "J. Morris", mrr: 39000, renewalDate: "2026-05-07", status: "success" },
    { id: "c5", company: "Stark Industries", owner: "S. Chen", mrr: 62000, renewalDate: "2026-03-01", status: "warning" },
    { id: "c6", company: "Wayne Tech", owner: "L. Green", mrr: 47000, renewalDate: "2026-02-27", status: "danger" }
  ]
};
