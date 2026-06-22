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

/** e.g. NEET.Q47 */
export function questionRefLabel(exam: string, questionNo: number): string {
  const examKey = exam === "JEE" ? "JEE" : exam === "NEET" ? "NEET" : exam;
  return `${examKey}.Q${questionNo}`;
}

/** e.g. NEET.Q47 | Magnetic Field and its Effects */
export function questionHeadingTitle(
  exam: string,
  questionNo: number,
  topic?: string | null,
  variantPrefix?: string | null
): string {
  const ref = variantPrefix
    ? `${variantPrefix} | ${questionRefLabel(exam, questionNo)}`
    : questionRefLabel(exam, questionNo);
  const topicPart = topic?.trim();
  return topicPart ? `${ref} | ${topicPart}` : ref;
}
