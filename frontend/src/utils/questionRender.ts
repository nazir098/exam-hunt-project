import { formatVariantTypeLabel, isAiVariantQuestion } from "./variantLabels";

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

/** R2 public base — used when API still returns local-dev {@code /files/} URLs. */
const PUBLIC_FILES_BASE = (
  (import.meta.env.VITE_PUBLIC_FILES_BASE_URL as string | undefined) ||
  "https://pub-e97c6c0fb4ed4d289eea27512d33293d.r2.dev"
).replace(/\/$/, "");

const LOCAL_FILES_URL =
  /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/files\/(.+)$/i;

/** Rewrite local API file URLs to the public CDN so production browsers can load diagrams. */
export function publicifyAssetUrl(url: string): string {
  if (!url?.trim()) return "";
  const trimmed = url.trim();
  const local = trimmed.match(LOCAL_FILES_URL);
  if (local) {
    return `${PUBLIC_FILES_BASE}/${local[1]}`;
  }
  return trimmed;
}

/** When a MinerU diagram crop is missing on CDN, fall back to the composite question image. */
export function diagramCompositeFallbackUrl(url: string, questionId: string): string {
  const publicUrl = publicifyAssetUrl(url);
  if (!publicUrl || !questionId || !/\/diagrams\//i.test(publicUrl)) return "";
  return publicUrl.replace(/\/diagrams\/[^/?#]+/i, `/questions/${encodeURIComponent(questionId)}.webp`);
}

export function cacheBustImageUrl(url: string, questionId: string) {
  const publicUrl = publicifyAssetUrl(url);
  if (!publicUrl) return "";
  const sep = publicUrl.includes("?") ? "&" : "?";
  return `${publicUrl}${sep}v=${encodeURIComponent(questionId)}`;
}

export function isStructuredRenderMode(renderMode?: string | null) {
  const mode = (renderMode || "").toLowerCase();
  return mode === "structured" || mode === "hybrid";
}

/** Blank or unknown modes default to composite image layout. */
export function isImageRenderMode(renderMode?: string | null) {
  return !isStructuredRenderMode(renderMode);
}

export function stemHasInlineAssets(text?: string | null) {
  return Boolean(text?.includes("{{asset:"));
}

function hasStructuredDisplayContent(q: QuestionRenderFields) {
  if (stemHasInlineAssets(q.questionTextPreview)) return true;
  if (q.questionTextPreview?.trim()) return true;
  if (q.options && q.options.length > 0) return true;
  if (q.questionDiagramSvg?.trim()) return true;
  if (q.assertion?.trim() || q.reason?.trim()) return true;
  if (q.statements && q.statements.length > 0) return true;
  if (q.matchListA && q.matchListA.length > 0) return true;
  return false;
}

/** Text MCQ layout when extractor marked structured/hybrid, or AI variation with stem/options. */
export function usesTextQuestionLayout(
  q: QuestionRenderFields & { sourceType?: string | null; variantNo?: number | null }
) {
  if (!hasStructuredDisplayContent(q)) return false;
  if (isStructuredRenderMode(q.renderMode)) return true;
  // Variations store stem/options in Mongo but often keep render_mode=image from import.
  if (isAiVariantQuestion(q)) return true;
  return false;
}

/** Dark question card — structured/hybrid PYQs and AI variants (shared UI). */
export function usesQuestionCardLayout(q: QuestionRenderFields) {
  return usesTextQuestionLayout(q);
}

/** @deprecated Exam-paper layout replaced by question card layout. */
export function usesExamPaperLayout(
  _q: QuestionRenderFields & { sourceType?: string },
  _variantTheme = false
) {
  return false;
}

/** Composite image layout — default when render_mode is image or unset. */
export function isImageQuestion(q: QuestionRenderFields) {
  if (usesTextQuestionLayout(q)) return false;
  if (!isImageRenderMode(q.renderMode)) return false;
  return Boolean(q.questionImageUrl?.trim());
}

export function isCompositeQuestionImage(url?: string | null) {
  if (!url?.trim()) return false;
  return /\/questions\/[^/?#]+\.(webp|png|jpe?g)(\?|$)/i.test(url.trim());
}

function diagramUrlFromPlacements(
  placements: AssetPlacementView[] | undefined,
  questionId: string
) {
  const row = placements?.find((p) => p.url?.trim());
  if (!row?.url) return "";
  return cacheBustImageUrl(row.url, questionId);
}

/** Diagram below stem for hybrid structured layouts (not inline {{asset:N}} markers). */
export function hybridDiagramUrl(q: QuestionRenderFields) {
  if (!isStructuredRenderMode(q.renderMode)) return "";
  if (stemHasInlineAssets(q.questionTextPreview)) return "";
  if (!q.hasDiagram) return "";

  const placementUrl = diagramUrlFromPlacements(q.assetPlacements, q.questionId);
  if (placementUrl) return placementUrl;

  const url = q.questionImageUrl?.trim() ?? "";
  if (!url || isCompositeQuestionImage(url)) return "";
  return cacheBustImageUrl(url, q.questionId);
}

export type TextMcqDisplayProps = {
  variantTheme: boolean;
  variantLabel?: string;
};

/** Shared dark-card props for structured PYQs and AI variants. */
export function textMcqDisplayProps(
  q: QuestionRenderFields & {
    sourceType?: string | null;
    variantType?: string | null;
    variantNo?: number | null;
  }
): TextMcqDisplayProps {
  const card = usesQuestionCardLayout(q);
  if (!card) {
    return { variantTheme: false };
  }
  if (isAiVariantQuestion(q)) {
    return {
      variantTheme: true,
      variantLabel: formatVariantTypeLabel(q.variantType, q.variantNo ?? undefined),
    };
  }
  return { variantTheme: true, variantLabel: "Original PYQ" };
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

/** SVG sibling for inline diagram assets when WebP is missing on CDN. */
export function resolveAssetSvgUrl(
  index: number,
  placements: AssetPlacementView[] | undefined,
  questionId: string
) {
  const row = placements?.find((p) => p.index === index);
  if (!row) return "";
  const fromUrl = publicifyAssetUrl(row.url || "").replace(/\.webp(\?|$)/i, ".svg$1");
  if (fromUrl && fromUrl !== publicifyAssetUrl(row.url || "")) {
    return cacheBustImageUrl(fromUrl, questionId);
  }
  const fromPath = row.path?.trim().replace(/\.webp$/i, ".svg");
  if (!fromPath) return "";
  if (row.url?.trim()) {
    const base = publicifyAssetUrl(row.url).replace(/\/[^/]+$/, "");
    return cacheBustImageUrl(`${base}/${fromPath.split("/").pop()}`, questionId);
  }
  return "";
}

/** Composite question image fallback when diagram crop 404s. */
export function resolveAssetCompositeFallbackUrl(
  index: number,
  placements: AssetPlacementView[] | undefined,
  questionId: string
) {
  const row = placements?.find((p) => p.index === index);
  if (!row?.url) return "";
  const composite = diagramCompositeFallbackUrl(row.url, questionId);
  return composite ? cacheBustImageUrl(composite, questionId) : "";
}
