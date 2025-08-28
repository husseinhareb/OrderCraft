// src/components/Dashboard/types.ts
export type NameCount = { name: string; count: number };
export type TimeCount = { period: string; count: number };
export type TimeDoneCount = { period: string; done: boolean; count: number };
export type ScheduleItem = { week: string; company: string; count: number };
export type LeadTimeBin =
  | { leadDays: number; count: number }
  | { lead_days: number; count: number };
export type BucketCount = { bucket: string; count: number };
export type HeatCell = { weekday: number; hour: number; count: number };

export type OrderExceptionRow = {
  id: number;
  articleName: string;
  clientName: string;
  city: string;
  deliveryCompany: string;
  deliveryDate: string;
  ageDays: number;
};
export type Exceptions = { overdueTop10: OrderExceptionRow[] };

export type TopItemShare = { name: string; count: number; sharePct: number };

export type Kpis = {
  totalOrders: number;
  openOrders: number;
  overdueOpen: number;
  dueToday: number;
  dueNext7: number;
  done7d: number;
  done30d: number;
  uniqueClients: number;
  returningClientsPct: number;
  avgLeadDays: number | null;
  medianLeadDays: number | null;
  topDeliveryCompany: TopItemShare | null;
  topArticle: NameCount | null;
  topCity: NameCount | null;
};

export type DashboardData = {
  kpis: Kpis;
  ordersOverTimeWeekly: TimeCount[];
  ordersOverTimeWeeklyByDone: TimeDoneCount[];
  deliveryScheduleWeeks: ScheduleItem[];
  leadTimeHistogram: LeadTimeBin[]; // may arrive as lead_days
  topArticles: NameCount[];
  companyShare90d: NameCount[];
  newVsReturningMonthly: [string, number, number][];
  backlogAgeBuckets: BucketCount[];
  activityHeatmap: HeatCell[];
  exceptions: Exceptions;
};
