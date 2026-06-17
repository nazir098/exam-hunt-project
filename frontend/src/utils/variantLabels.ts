const VARIANT_TYPE_LABELS: Record<string, string> = {
  numerical: "Numerical variation",
  conceptual: "Conceptual variation",
  assertion_reason: "Assertion–reason",
  statement_based: "Statement based",
  hard_application: "Hard application",
  matching: "Matching",
  mcq: "MCQ variation",
};

export function formatVariantTypeLabel(variantType?: string | null, variantNo?: number): string {
  const raw = (variantType ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  if (raw && VARIANT_TYPE_LABELS[raw]) {
    return VARIANT_TYPE_LABELS[raw];
  }
  if (raw) {
    return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return variantNo ? `Variation ${variantNo}` : "AI variation";
}

export const VARIANT_SWITCH_DELAY_MS = 2000;
export const ORIGINAL_SWITCH_DELAY_MS = 450;

export type VariantSwitchMode = "ai" | "normal";

export type VariantSwitchState = {
  active: boolean;
  mode: VariantSwitchMode | null;
  label: string;
};

export const VARIANT_SWITCH_IDLE: VariantSwitchState = {
  active: false,
  mode: null,
  label: "",
};

function normalizeVariantKey(value?: string | null): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

/** Plain MCQ stems (numerical / hard application) need a visible question marker. */
export function needsQuestionPrefix(
  variantType?: string | null,
  questionFormat?: string,
  resolvedFormat?: string
): boolean {
  const type = normalizeVariantKey(variantType);
  const format = normalizeVariantKey(questionFormat);
  if (resolvedFormat === "assertion_reason" || resolvedFormat === "statement_based") {
    return false;
  }
  if (resolvedFormat === "matching" || type === "matching" || format === "matching") {
    return false;
  }
  return (
    type === "numerical" ||
    type === "hard_application" ||
    format === "numerical" ||
    format === "hard_application"
  );
}

/** Strip a leading Q. / Q: so the visual marker is not duplicated in the body. */
export function questionStemBody(text: string): string {
  const trimmed = text.trim();
  const withoutPrefix = trimmed.replace(/^q[.:]\s*/i, "").trim();
  return withoutPrefix || trimmed;
}
