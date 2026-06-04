import type { PackSummary } from "../api";

export type SubjectTile = {
  name: string;
  icon: string;
  querySubject: string;
  questionCount: number;
  chapterCount: number;
};

const TILE_DEFS = [
  { name: "Physics", icon: "architecture", querySubject: "Physics" },
  { name: "Chemistry", icon: "science", querySubject: "Chemistry" },
  { name: "Botany", icon: "eco", querySubject: "Biology" },
  { name: "Zoology", icon: "pets", querySubject: "Biology" },
] as const;

/** NEET subject tiles with counts aggregated from pack facets. */
export function buildSubjectTiles(packs: PackSummary[]): SubjectTile[] {
  const chaptersBySubject = new Map<string, Set<string>>();
  const questionsBySubject = new Map<string, number>();

  for (const pack of packs) {
    for (const s of pack.facets?.subjects ?? []) {
      questionsBySubject.set(s.name, (questionsBySubject.get(s.name) ?? 0) + s.count);
    }
    for (const ch of pack.facets?.chapters ?? []) {
      if (!chaptersBySubject.has(ch.subject)) chaptersBySubject.set(ch.subject, new Set());
      chaptersBySubject.get(ch.subject)!.add(ch.chapter);
    }
  }

  const biologyChapters = chaptersBySubject.get("Biology")?.size ?? 0;
  const biologyQuestions = questionsBySubject.get("Biology") ?? 0;

  return TILE_DEFS.map((def) => {
    const isBioSplit = def.name === "Botany" || def.name === "Zoology";
    const chapters = isBioSplit
      ? Math.max(1, Math.ceil(biologyChapters / 2))
      : chaptersBySubject.get(def.querySubject)?.size ?? 0;
    const questionCount = isBioSplit
      ? Math.ceil(biologyQuestions / 2)
      : questionsBySubject.get(def.querySubject) ?? 0;
    return {
      name: def.name,
      icon: def.icon,
      querySubject: def.querySubject,
      questionCount,
      chapterCount: chapters,
    };
  });
}

export function countUniqueChapters(packs: PackSummary[]): number {
  const chapters = new Set<string>();
  for (const pack of packs) {
    for (const ch of pack.facets?.chapters ?? []) {
      chapters.add(`${ch.subject}::${ch.chapter}`);
    }
  }
  return chapters.size;
}
