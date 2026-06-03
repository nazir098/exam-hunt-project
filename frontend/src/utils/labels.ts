export function difficultyLabel(level: number): "Easy" | "Medium" | "Hard" {
  if (level <= 1) return "Easy";
  if (level === 2) return "Medium";
  return "Hard";
}

export function marksLabel(difficulty: number, questionNo: number): string {
  const marks = difficulty === 2 || questionNo % 2 === 1 ? 2 : 4;
  return `${marks} marks`;
}

export function examDisplayName(exam: string, year: number): string {
  if (exam === "JEE") return "JEE Main";
  if (exam === "NEET") return "NEET";
  return `${exam} ${year}`;
}
