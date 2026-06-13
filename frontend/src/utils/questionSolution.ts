/** Question fields needed to decide if solution adds more than revealing the answer. */
type SolutionFields = {
  solutionImageUrl?: string;
  solutionDiagramSvg?: string;
  solutionTextPreview?: string;
};

/** True when official solution has substance beyond naming the correct option. */
export function hasDistinctSolution(q: SolutionFields): boolean {
  if (q.solutionImageUrl?.trim()) return true;
  if (q.solutionDiagramSvg?.trim()) return true;
  const text = q.solutionTextPreview?.trim() ?? "";
  if (!text) return false;
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
