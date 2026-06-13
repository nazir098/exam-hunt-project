export type DifficultyLevel = "easy" | "medium" | "hard";

export const DIFFICULTY_LEVELS: { value: DifficultyLevel; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

/** API / browse query — "Easy,Medium" or undefined for mixed. */
export function formatDifficultyParam(levels: DifficultyLevel[]): string | undefined {
  if (levels.length === 0) return undefined;
  return levels.map((l) => l.charAt(0).toUpperCase() + l.slice(1)).join(",");
}

/** Session create body — lowercase comma list. */
export function formatDifficultySessionParam(levels: DifficultyLevel[]): string | undefined {
  if (levels.length === 0) return undefined;
  return levels.join(",");
}

export function difficultySelectionLabel(levels: DifficultyLevel[]): string {
  if (levels.length === 0) return "Mixed";
  if (levels.length === 3) return "All levels";
  return levels.map((l) => l.charAt(0).toUpperCase() + l.slice(1)).join(" + ");
}

export function toggleDifficultyLevel(
  current: DifficultyLevel[],
  level: DifficultyLevel
): DifficultyLevel[] {
  if (current.includes(level)) {
    return current.filter((l) => l !== level);
  }
  return [...current, level].sort(
    (a, b) =>
      DIFFICULTY_LEVELS.findIndex((d) => d.value === a) -
      DIFFICULTY_LEVELS.findIndex((d) => d.value === b)
  );
}
