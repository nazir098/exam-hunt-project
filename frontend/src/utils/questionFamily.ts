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
