const VARIANT_TYPE_LABELS: Record<string, string> = {
  numerical: "Numerical variation",
  conceptual: "Conceptual variation",
  assertion_reason: "Assertion–reason",
  statement_based: "Statement based",
  hard_application: "Hard application",
  matching: "Matching",
  mcq: "MCQ variation",
};

export function isAiVariantQuestion(q: {
  sourceType?: string | null;
  variantNo?: number | null;
}): boolean {
  return q.sourceType === "ai_variant" && (q.variantNo ?? 0) > 0;
}

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

/** Standard NEET assertion–reason answer choices when option text is missing from sync. */
export const ASSERTION_REASON_STANDARD_OPTIONS: { id: string; text: string }[] = [
  {
    id: "1",
    text: "Both Assertion (A) and Reason (R) are true and Reason (R) is the correct explanation of Assertion (A).",
  },
  {
    id: "2",
    text: "Both Assertion (A) and Reason (R) are true, but Reason (R) is **not** the correct explanation of Assertion (A).",
  },
  { id: "3", text: "Assertion (A) is true, but Reason (R) is false." },
  { id: "4", text: "Assertion (A) is false, but Reason (R) is true." },
];

export function resolveAssertionReasonOptions(
  options: { id: string; text: string }[]
): { id: string; text: string }[] {
  const std = ASSERTION_REASON_STANDARD_OPTIONS;
  if (!options.length) return std;
  const merged = options.map((opt, idx) => {
    const text = opt.text?.trim();
    if (text) return opt;
    const fallback = std.find((s) => s.id === opt.id) ?? std[idx];
    return fallback ? { ...opt, text: fallback.text } : opt;
  });
  if (merged.every((o) => !o.text?.trim())) return std;
  return merged;
}

export type VariantSwitchMode = "ai" | "normal";

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
