import type { ExamCatalogEntry, PackSummary, PublicPlatformSettings } from "../api";
import { countUniqueChapters } from "./bankSubjects";

export type PlatformStats = {
  totalQuestions: number;
  yearsLive: number;
  chaptersCovered: number;
  examsAvailable: number;
};

export function buildPlatformStats(
  catalog: ExamCatalogEntry[],
  packs: PackSummary[],
  platform?: Pick<PublicPlatformSettings, "displayTotalQuestions" | "displayChapters" | "marketingPyqFloor">
): PlatformStats {
  const neet = catalog.find((c) => c.id === "NEET");
  const liveTotal =
    neet?.totalQuestions ?? packs.reduce((s, p) => s + p.questionCount, 0);
  const floor = platform?.marketingPyqFloor ?? 25_000;
  const totalQuestions = platform?.displayTotalQuestions ?? Math.max(liveTotal, floor);
  const yearsLive = neet?.availableYears ?? packs.length;
  const chaptersLive = countUniqueChapters(packs);
  const chaptersCovered = platform?.displayChapters ?? (chaptersLive || 120);
  return {
    totalQuestions: totalQuestions || 400,
    yearsLive: yearsLive || 3,
    chaptersCovered,
    examsAvailable: catalog.filter((e) => e.status === "available").length || 1,
  };
}
