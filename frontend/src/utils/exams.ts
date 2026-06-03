import { ExamCatalogEntry } from "../api";

export const EXAM_PILLS = [
  { id: "NEET", label: "NEET" },
  { id: "JEE Main", label: "JEE Main" },
  { id: "JEE Advanced", label: "JEE Advanced" },
  { id: "UPSC", label: "UPSC" },
  { id: "CAT", label: "CAT" },
] as const;

export function findExam(catalog: ExamCatalogEntry[], id: string): ExamCatalogEntry | undefined {
  return catalog.find((e) => e.id === id);
}

export function isExamAvailable(catalog: ExamCatalogEntry[], id: string): boolean {
  const exam = findExam(catalog, id);
  return exam?.status === "available";
}

export function defaultExamId(catalog: ExamCatalogEntry[]): string {
  return findExam(catalog, "NEET")?.id || catalog[0]?.id || "NEET";
}
