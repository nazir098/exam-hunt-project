import type { ChapterProgress } from "../api";

export type InsightChipKind = "mistake" | "strategy" | "weak" | "strength" | "general";

export type InsightChip = {
  kind: InsightChipKind;
  icon: string;
  label: string;
  text: string;
};

const CHIP_META: Record<InsightChipKind, { icon: string; label: string }> = {
  mistake: { icon: "error", label: "Mistake pattern" },
  strategy: { icon: "psychology", label: "Exam strategy tip" },
  weak: { icon: "priority_high", label: "Weak chapter alert" },
  strength: { icon: "trending_up", label: "Strength signal" },
  general: { icon: "auto_awesome", label: "AI insight" },
};

function classifyInsight(line: string): InsightChipKind {
  const lower = line.toLowerCase();
  if (lower.includes("caused") && lower.includes("mistakes")) return "mistake";
  if (lower.includes("medium difficulty") || lower.includes("accuracy drops") || lower.includes("slow down")) {
    return "strategy";
  }
  if (lower.includes("perform best") || lower.includes("strongest")) return "strength";
  if (lower.includes("weak") || lower.includes("review wrong")) return "weak";
  return "general";
}

export function insightChipsFromLines(lines: string[], weakChapters: ChapterProgress[]): InsightChip[] {
  const chips = lines.map((text) => {
    const kind = classifyInsight(text);
    const meta = CHIP_META[kind];
    return { kind, icon: meta.icon, label: meta.label, text };
  });

  if (chips.length === 0 && weakChapters.length > 0) {
    const top = weakChapters[0];
    chips.push({
      kind: "weak",
      icon: CHIP_META.weak.icon,
      label: CHIP_META.weak.label,
      text: `${top.chapter} needs attention — ${top.accuracyPercent}% accuracy in this test.`,
    });
  }

  return chips.slice(0, 3);
}

export function estimatedRecoveryGain(wrongCount: number, weakChapters: ChapterProgress[]): number {
  if (wrongCount <= 0 && weakChapters.length === 0) return 0;
  const gap = weakChapters.reduce((sum, c) => sum + Math.max(0, 100 - c.accuracyPercent), 0);
  const avgGap = weakChapters.length ? gap / weakChapters.length : 50;
  return Math.max(8, Math.round(wrongCount * 3 + (avgGap / 100) * 12));
}
