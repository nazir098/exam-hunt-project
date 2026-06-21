import type { RevisionItemView } from "../api";

export type RevisionPriorityBreakdown = {
  high: number;
  medium: number;
  low: number;
  total: number;
};

/** Group pending revision items by recency for dashboard display. */
export function revisionPriorityBreakdown(items: RevisionItemView[]): RevisionPriorityBreakdown {
  const now = Date.now();
  let high = 0;
  let medium = 0;
  let low = 0;

  for (const item of items) {
    const ageDays = (now - new Date(item.addedAt).getTime()) / 86_400_000;
    if (ageDays <= 2) high += 1;
    else if (ageDays <= 7) medium += 1;
    else low += 1;
  }

  return { high, medium, low, total: items.length };
}
