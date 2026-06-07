import type { PracticeSessionView } from "../api";
import type { DashboardStats } from "./dashboardStats";

/** 4 weeks × 7 days — demo activity pattern (darker toward recent days). */
export const DEMO_HEATMAP: number[] = [
  0, 1, 0, 1, 2, 0, 1, 1, 2, 1, 3, 2, 1, 0, 2, 3, 2, 4, 3, 2, 4, 3, 4, 4, 3, 4, 4, 3,
];

export const DEMO_BAR_HEIGHTS = [52, 58, 61, 64, 68, 72];

export const DEMO_SUBJECTS = [
  { name: "Physics", pct: 74, trend: "+6%", tone: "warn" as const },
  { name: "Chemistry", pct: 61, trend: "Focus", tone: "focus" as const },
  { name: "Biology", pct: 82, trend: "+4%", tone: "good" as const },
];

export const DEMO_ACCURACY = 68;
export const DEMO_ATTEMPTS = 247;
export const DEMO_TOTAL_MARKS = 412;
export const DEMO_CORRECT = 168;

export const DEMO_SESSIONS: PracticeSessionView[] = [
  {
    id: "preview-1",
    packId: "NEET_2024",
    exam: "NEET",
    status: "completed",
    questionCount: 20,
    currentIndex: 19,
    correctCount: 14,
    wrongCount: 6,
    skipCount: 0,
    totalMarks: 50,
    maxMarks: 80,
    adaptiveLevel: 3,
    startedAt: "2026-06-03T09:00:00Z",
    completedAt: "2026-06-03T09:42:00Z",
    currentQuestionId: null,
  },
  {
    id: "preview-2",
    packId: "NEET_2023",
    exam: "NEET",
    status: "completed",
    questionCount: 20,
    currentIndex: 19,
    correctCount: 11,
    wrongCount: 9,
    skipCount: 0,
    totalMarks: 26,
    maxMarks: 80,
    adaptiveLevel: 2,
    startedAt: "2026-06-02T18:00:00Z",
    completedAt: "2026-06-02T18:38:00Z",
    currentQuestionId: null,
  },
  {
    id: "preview-3",
    packId: "NEET_2024",
    exam: "NEET",
    status: "completed",
    questionCount: 20,
    currentIndex: 19,
    correctCount: 16,
    wrongCount: 4,
    skipCount: 0,
    totalMarks: 56,
    maxMarks: 80,
    adaptiveLevel: 4,
    startedAt: "2026-06-01T11:00:00Z",
    completedAt: "2026-06-01T11:35:00Z",
    currentQuestionId: null,
  },
  {
    id: "preview-4",
    packId: "NEET_2022",
    exam: "NEET",
    status: "active",
    questionCount: 20,
    currentIndex: 8,
    correctCount: 5,
    wrongCount: 4,
    skipCount: 0,
    totalMarks: 16,
    maxMarks: 80,
    adaptiveLevel: 2,
    startedAt: "2026-05-31T20:00:00Z",
    completedAt: null,
    currentQuestionId: "preview-q",
  },
];

export const DEMO_STATS: DashboardStats = {
  sessions: DEMO_SESSIONS,
  bars: [52, 58, 61, 64, 68],
  trend: 12,
  heatmap: DEMO_HEATMAP,
  totalMarks: DEMO_TOTAL_MARKS,
  maxMarks: 520,
  packs: [],
  activeSession: null,
};

export const ANALYTICS_FEATURE_CARDS = [
  {
    icon: "monitoring",
    title: "Accuracy trends",
    desc: "See whether your % is climbing session over session — not just a single test score.",
  },
  {
    icon: "calendar_month",
    title: "Study heatmaps",
    desc: "Spot gaps in your weekly rhythm before they become exam-week panic.",
  },
  {
    icon: "history",
    title: "Session history",
    desc: "Every adaptive run logged with marks, accuracy, and resume links.",
  },
  {
    icon: "psychology",
    title: "AI weak-area hints",
    desc: "Chapter-level signals from real attempts — know what to drill next.",
  },
] as const;

export const LOCKED_WIDGETS = [
  { icon: "map", title: "Weak chapter map", desc: "Visual breakdown by subject & chapter" },
  { icon: "emoji_events", title: "Marks goal tracker", desc: "Weekly targets tied to your rank" },
  { icon: "groups", title: "Peer percentile", desc: "Compare accuracy vs leaderboard cohort" },
] as const;
