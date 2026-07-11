import type { QuestionFamily } from "../api";
import { formatVariantTypeLabel, type VariantSwitchMode } from "./variantLabels";

/** Parent PYQ id for a question URL or loaded detail (PYQ or AI variant). */
export function familyParentId(questionId: string, parentQuestionId?: string | null): string {
  if (parentQuestionId?.trim()) return parentQuestionId.trim();
  const match = questionId.match(/^AI_(.+)_V\d+$/);
  if (match) return match[1];
  return questionId;
}

export function isAiVariantQuestionId(questionId: string): boolean {
  return /^AI_.+_V\d+$/.test(questionId);
}

export function isSamePaperQuestion(
  nextQuestionId: string,
  current: { questionId: string; parentQuestionId?: string | null } | null | undefined
): boolean {
  if (!current?.questionId) return false;
  return (
    familyParentId(nextQuestionId) ===
    familyParentId(current.questionId, current.parentQuestionId)
  );
}

/** PYQ ↔ PYQ navigation within the same pack (not variant switches on one paper). */
export function isPackSiblingNavigation(
  nextQuestionId: string,
  current: { questionId: string; parentQuestionId?: string | null; packId?: string | null } | null | undefined
): boolean {
  if (!current?.packId?.trim()) return false;
  if (isSamePaperQuestion(nextQuestionId, current)) return false;
  return familyParentId(nextQuestionId) !== familyParentId(current.questionId, current.parentQuestionId);
}

export function variantSwitchLoaderForTarget(
  targetQuestionId: string,
  family?: QuestionFamily | null
): { mode: VariantSwitchMode; label: string } {
  if (family?.pyq.questionId === targetQuestionId) {
    return { mode: "normal", label: "" };
  }
  const variant = family?.variants.find((v) => v.questionId === targetQuestionId);
  if (variant) {
    return {
      mode: "ai",
      label: formatVariantTypeLabel(variant.variantType, variant.variantNo),
    };
  }
  if (isAiVariantQuestionId(targetQuestionId)) {
    return { mode: "ai", label: "" };
  }
  return { mode: "normal", label: "" };
}
