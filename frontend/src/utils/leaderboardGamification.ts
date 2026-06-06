import type { LeaderboardEntry, LeaderboardStats, ProgressSummary } from "../api";

export type ScholarBadge = {
  id: string;
  icon: string;
  title: string;
  desc: string;
  earned: boolean;
  progress?: number;
  target?: number;
};

export type AchievementCard = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  highlight: string;
  tone: "gold" | "violet" | "mint" | "amber";
};

export function defaultStats(): LeaderboardStats {
  return {
    scholarsInPeriod: 0,
    totalMarks: 0,
    totalAttempts: 0,
    totalCorrect: 0,
    avgAccuracyPercent: 0,
    allTimeScholars: 0,
    allTimeAttempts: 0,
    questionBankSize: 0,
    weeklyChallengeTarget: 250,
  };
}

export function periodMotivation(
  period: string,
  stats: LeaderboardStats,
  playerCount: number
): { headline: string; sub: string } {
  const marks = stats.totalMarks.toLocaleString();
  const attempts = stats.totalAttempts.toLocaleString();
  if (playerCount === 0) {
    return {
      headline: "Be the first name on the board",
      sub: `${stats.questionBankSize > 0 ? stats.questionBankSize.toLocaleString() + " PYQs" : "Thousands of PYQs"} are waiting — one practice session puts you in the spotlight.`,
    };
  }
  if (playerCount < 5) {
    return {
      headline: "Early arena — every mark counts",
      sub: `${playerCount} scholar${playerCount === 1 ? "" : "s"} competing this ${periodLabel(period)} · ${marks} marks and ${attempts} attempts logged so far.`,
    };
  }
  return {
    headline: "Climb the ranks, own the week",
    sub: `${playerCount} scholars active · ${marks} marks on the line this ${periodLabel(period)}.`,
  };
}

function periodLabel(period: string): string {
  if (period === "weekly") return "week";
  if (period === "monthly") return "month";
  return "season";
}

export function weeklyBadges(
  stats: LeaderboardStats,
  you: LeaderboardEntry | null | undefined,
  progress: ProgressSummary | null | undefined
): ScholarBadge[] {
  const yourMarks = you?.totalMarks ?? 0;
  const yourAttempts = you?.attempts ?? progress?.totalAttempts ?? 0;
  const yourAcc = you?.accuracyPercent ?? progress?.accuracyPercent ?? 0;
  const target = stats.weeklyChallengeTarget || 250;

  return [
    {
      id: "warrior",
      icon: "swords",
      title: "Weekly Warrior",
      desc: "Log at least one scored attempt this period",
      earned: yourAttempts > 0,
      progress: yourAttempts > 0 ? 1 : 0,
      target: 1,
    },
    {
      id: "century",
      icon: "stars",
      title: "Century Club",
      desc: `Earn ${target}+ marks this period`,
      earned: yourMarks >= target,
      progress: Math.min(yourMarks, target),
      target,
    },
    {
      id: "precision",
      icon: "target",
      title: "Precision Ace",
      desc: "80%+ accuracy with 10+ attempts",
      earned: yourAcc >= 80 && yourAttempts >= 10,
      progress: Math.min(yourAttempts, 10),
      target: 10,
    },
    {
      id: "podium",
      icon: "emoji_events",
      title: "Podium Hunter",
      desc: "Reach top 3 on the board",
      earned: (you?.rank ?? 99) <= 3,
    },
  ];
}

export function achievementHighlights(entries: LeaderboardEntry[]): AchievementCard[] {
  if (entries.length === 0) return [];

  const cards: AchievementCard[] = [];

  const topMarks = [...entries].sort((a, b) => b.totalMarks - a.totalMarks)[0];
  if (topMarks) {
    cards.push({
      id: "marks",
      icon: "military_tech",
      title: "Marks Champion",
      subtitle: "Highest total this period",
      highlight: topMarks.displayName,
      tone: "gold",
    });
  }

  const withAttempts = entries.filter((e) => e.attempts >= 3);
  if (withAttempts.length) {
    const topAcc = [...withAttempts].sort((a, b) => b.accuracyPercent - a.accuracyPercent)[0];
    cards.push({
      id: "accuracy",
      icon: "verified",
      title: "Accuracy Ace",
      subtitle: `${topAcc.accuracyPercent}% over ${topAcc.attempts} attempts`,
      highlight: topAcc.displayName,
      tone: "mint",
    });
  }

  const grinder = [...entries].sort((a, b) => b.attempts - a.attempts)[0];
  if (grinder && grinder.attempts > 0) {
    cards.push({
      id: "volume",
      icon: "local_fire_department",
      title: "Grind Master",
      subtitle: "Most questions attempted",
      highlight: `${grinder.displayName} · ${grinder.attempts}`,
      tone: "amber",
    });
  }

  return cards.slice(0, 3);
}

export function scholarTitle(rank: number): string {
  if (rank === 1) return "Grand Scholar";
  if (rank === 2) return "Silver Mind";
  if (rank === 3) return "Bronze Striker";
  return "Rising Scholar";
}

export function communityPulse(stats: LeaderboardStats): { label: string; value: string; icon: string }[] {
  return [
    {
      icon: "groups",
      label: "Active scholars",
      value: String(Math.max(stats.scholarsInPeriod, stats.allTimeScholars)),
    },
    {
      icon: "bolt",
      label: "Attempts",
      value: stats.totalAttempts.toLocaleString(),
    },
    {
      icon: "scoreboard",
      label: "Marks scored",
      value: stats.totalMarks.toLocaleString(),
    },
    {
      icon: "percent",
      label: "Avg accuracy",
      value: stats.totalAttempts > 0 ? `${stats.avgAccuracyPercent}%` : "—",
    },
  ];
}
