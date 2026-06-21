import type { WrongAttemptView } from "../api";

export type WrongTab = "priority" | "due-today" | "recent" | "all";
export type WrongSort = "latest" | "oldest" | "subject";

const DIFFICULTY_LABELS = ["Easy", "Medium", "Hard"] as const;
const MISTAKE_TYPES = ["Conceptual", "Application", "Calculation", "Careless"] as const;

export type MistakeType = (typeof MISTAKE_TYPES)[number];

export function daysSinceAnswered(item: WrongAttemptView): number {
  const answered = new Date(item.answeredAt).getTime();
  if (Number.isNaN(answered)) return 0;
  return Math.max(0, Math.floor((Date.now() - answered) / 86_400_000));
}

export function attemptedAgoLabel(item: WrongAttemptView): string {
  const days = daysSinceAnswered(item);
  if (days === 0) return "Attempted today";
  if (days === 1) return "Attempted yesterday";
  return `Attempted ${days} days ago`;
}

export function difficultyLabel(item: WrongAttemptView): string {
  if (item.difficultyLabel) return item.difficultyLabel;
  const seed = item.questionId.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return DIFFICULTY_LABELS[seed % DIFFICULTY_LABELS.length];
}

export function mistakeTypeLabel(item: WrongAttemptView): MistakeType {
  if (item.mistakeType && MISTAKE_TYPES.includes(item.mistakeType as MistakeType)) {
    return item.mistakeType as MistakeType;
  }
  const subj = item.subject.toLowerCase();
  if (subj.includes("phys")) return "Calculation";
  if (subj.includes("chem")) return "Application";
  const days = daysSinceAnswered(item);
  if (days <= 1 && item.selectedAnswer !== item.correctAnswer) return "Careless";
  return "Conceptual";
}

export type RevisionDue = {
  label: string;
  tone: "today" | "soon" | "done" | "overdue";
};

export function revisionDueLabel(item: WrongAttemptView): RevisionDue {
  if (item.revisionDueLabel) {
    const tone = (["today", "soon", "done", "overdue"].includes(item.revisionDueTone)
      ? item.revisionDueTone
      : "soon") as RevisionDue["tone"];
    return { label: item.revisionDueLabel, tone };
  }
  if (item.revised) return { label: "Revised", tone: "done" };
  const days = daysSinceAnswered(item);
  if (days === 0) return { label: "Tomorrow", tone: "soon" };
  if (days === 1) return { label: "2 days left", tone: "soon" };
  if (days <= 3) return { label: "Today", tone: "today" };
  if (days <= 7) return { label: "Overdue", tone: "overdue" };
  return { label: `${days - 3} days overdue`, tone: "overdue" };
}

export function matchesWrongTab(item: WrongAttemptView, tab: WrongTab): boolean {
  if (tab === "all") return true;
  const days = daysSinceAnswered(item);
  if (tab === "recent") return days <= 3;
  if (item.revised) return false;
  if (tab === "due-today") return days >= 2 && days <= 4;
  return days >= 3;
}

export function countWrongTab(items: WrongAttemptView[], tab: WrongTab): number {
  return items.filter((item) => matchesWrongTab(item, tab)).length;
}

export function searchWrongAttempts(items: WrongAttemptView[], query: string): WrongAttemptView[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => {
    const haystack = [
      item.exam,
      String(item.year),
      String(item.questionNo),
      item.subject,
      item.chapter,
      item.mode,
      item.selectedAnswer,
      item.correctAnswer,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function sortWrongAttempts(items: WrongAttemptView[], sort: WrongSort): WrongAttemptView[] {
  const copy = [...items];
  if (sort === "oldest") {
    return copy.sort(
      (a, b) => new Date(a.answeredAt).getTime() - new Date(b.answeredAt).getTime()
    );
  }
  if (sort === "subject") {
    return copy.sort((a, b) => {
      const subj = a.subject.localeCompare(b.subject);
      if (subj !== 0) return subj;
      return a.chapter.localeCompare(b.chapter);
    });
  }
  return copy.sort(
    (a, b) => new Date(b.answeredAt).getTime() - new Date(a.answeredAt).getTime()
  );
}
