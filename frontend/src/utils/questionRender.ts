export type AssetPlacementView = {
  index: number;
  marker: string;
  path: string;
  url: string;
};

export type QuestionRenderFields = {
  questionId: string;
  questionImageUrl?: string;
  questionTextPreview?: string;
  options?: { id: string; text: string }[];
  renderMode?: string;
  hasDiagram?: boolean;
  sourceType?: string;
  questionDiagramSvg?: string;
  assertion?: string;
  reason?: string;
  statements?: unknown[];
  matchListA?: unknown[];
  assetPlacements?: AssetPlacementView[];
};

export function cacheBustImageUrl(url: string, questionId: string) {
  if (!url) return "";
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${encodeURIComponent(questionId)}`;
}

export function isStructuredRenderMode(renderMode?: string | null) {
  const mode = (renderMode || "").toLowerCase();
  return mode === "structured" || mode === "hybrid";
}

export function stemHasInlineAssets(text?: string | null) {
  return Boolean(text?.includes("{{asset:"));
}

export function usesTextQuestionLayout(q: QuestionRenderFields) {
  if (isStructuredRenderMode(q.renderMode)) {
    if (q.options && q.options.length > 0) return true;
    if (stemHasInlineAssets(q.questionTextPreview)) return true;
  }
  if (q.options && q.options.length > 0) return true;
  if (q.questionDiagramSvg?.trim()) return true;
  if (q.assertion?.trim() || q.reason?.trim()) return true;
  if (q.statements && q.statements.length > 0) return true;
  if (q.matchListA && q.matchListA.length > 0) return true;
  if (q.sourceType === "ai_variant" && q.questionTextPreview?.trim()) return true;
  return false;
}

export function isImageQuestion(q: QuestionRenderFields) {
  return Boolean(q.questionImageUrl?.trim()) && !usesTextQuestionLayout(q);
}

/** Diagram below stem for hybrid/AI text layouts (not inline {{asset:N}} markers). */
export function hybridDiagramUrl(q: QuestionRenderFields) {
  if (stemHasInlineAssets(q.questionTextPreview)) return "";
  if (!q.questionImageUrl?.trim()) return "";
  if (q.sourceType === "ai_variant") {
    return cacheBustImageUrl(q.questionImageUrl, q.questionId);
  }
  if (isStructuredRenderMode(q.renderMode)) {
    if (!q.hasDiagram) return "";
    return cacheBustImageUrl(q.questionImageUrl, q.questionId);
  }
  if (!q.hasDiagram) return "";
  return cacheBustImageUrl(q.questionImageUrl, q.questionId);
}

export function resolveAssetUrl(
  index: number,
  placements: AssetPlacementView[] | undefined,
  questionId: string
) {
  const row = placements?.find((p) => p.index === index);
  if (!row?.url) return "";
  return cacheBustImageUrl(row.url, questionId);
}
