/** Question fields needed to decide if solution adds more than revealing the answer. */
export type SolutionFields = {
  solutionImageUrl?: string;
  solutionDiagramSvg?: string;
  solutionTextPreview?: string;
};

export type SolutionDisplay =
  | { kind: "text"; text: string }
  | { kind: "svg"; svg: string }
  | { kind: "image"; url: string }
  | { kind: "empty" };

/** Prefer extracted LaTeX/markdown solution text over PDF crop images. */
export function pickSolutionDisplay(q: SolutionFields): SolutionDisplay {
  const text = q.solutionTextPreview?.trim() ?? "";
  const svg = q.solutionDiagramSvg?.trim() ?? "";
  const imageUrl = q.solutionImageUrl?.trim() ?? "";
  if (text) return { kind: "text", text };
  if (svg) return { kind: "svg", svg };
  if (imageUrl) return { kind: "image", url: imageUrl };
  return { kind: "empty" };
}

/** True when official solution has substance beyond naming the correct option. */
export function hasDistinctSolution(q: SolutionFields): boolean {
  const display = pickSolutionDisplay(q);
  if (display.kind === "image" || display.kind === "svg") return true;
  if (display.kind !== "text") return false;
  const text = display.text;
  const stepMarkers = text.match(/\*\*Step\s*\d+/gi);
  if (stepMarkers && stepMarkers.length >= 2) return true;
  if (text.length > 140) return true;
  const plain = text.replace(/\*\*/g, "").replace(/\s+/g, " ").trim().toLowerCase();
  if (/^(therefore|hence|thus|so)[,.]?\s*(the answer is|option\s*[1-4])/i.test(plain)) {
    return false;
  }
  if (/^option\s*[1-4]\s+is\s+(the\s+)?(correct\s+)?answer/i.test(plain)) {
    return false;
  }
  return text.length > 60;
}
