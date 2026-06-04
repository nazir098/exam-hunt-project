import { LeaderboardEntry } from "../api";

export function formatLeaderboardPts(marks: number): string {
  const sign = marks < 0 ? "−" : "";
  return `${sign}${Math.abs(marks).toLocaleString()} pts`;
}

export function avatarInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return displayName.slice(0, 2).toUpperCase() || "?";
}

export function avatarHue(userId: string): number {
  let h = 0;
  for (let i = 0; i < userId.length; i++) {
    h = (h + userId.charCodeAt(i) * 17) % 360;
  }
  return h;
}

export function masteryLabel(entry: LeaderboardEntry): string {
  return `Practice accuracy: ${entry.accuracyPercent}%`;
}

export function showTrendUp(entry: LeaderboardEntry): boolean {
  return entry.accuracyPercent >= 60 || entry.totalMarks > 0;
}

/** Podium visual order: 2nd, 1st, 3rd */
export function podiumSlots(top3: LeaderboardEntry[]): (LeaderboardEntry | null)[] {
  const [first, second, third] = top3;
  return [second ?? null, first ?? null, third ?? null];
}

export function filterEntries(entries: LeaderboardEntry[], query: string): LeaderboardEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter((e) => e.displayName.toLowerCase().includes(q));
}
