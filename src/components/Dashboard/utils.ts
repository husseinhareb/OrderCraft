// src/components/Dashboard/utils.ts
export const fmt = new Intl.NumberFormat();
export const pct = (n: number | null | undefined) =>
  n == null ? "—" : `${(Math.round(n * 10) / 10).toFixed(1)}%`;
export const days = (n: number | null | undefined) =>
  n == null ? "—" : `${Math.round(n)}d`;

export function normalizeLeadBins(
  bins?:
    | (
        | { leadDays: number; count: number }
        | { lead_days: number; count: number }
      )[]
    | null
) {
  if (!Array.isArray(bins)) return [];
  return bins
    .map((b: any) => {
      const leadDays = b.leadDays ?? b.lead_days;
      const count = b.count;
      return leadDays == null || count == null
        ? null
        : { leadDays: Number(leadDays), count: Number(count) };
    })
    .filter(Boolean) as { leadDays: number; count: number }[];
}
