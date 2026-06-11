import type { PracticeAiFeature } from "../api";

/** Priority order for practice-focused AI (no open tutor chat). */
export const PRACTICE_AI_FEATURES: {
  id: PracticeAiFeature;
  label: string;
  icon: string;
  description: string;
  /** Shown on question screen before submit */
  beforeSubmit?: boolean;
  /** Shown after wrong submit */
  afterWrong?: boolean;
  /** Shown after any submit */
  afterSubmit?: boolean;
  /** No question context required */
  global?: boolean;
}[] = [
  {
    id: "why_wrong",
    label: "Why is my answer wrong?",
    icon: "help",
    description: "Misconception + correct reasoning",
    afterWrong: true,
  },
  {
    id: "hint",
    label: "Give me a hint",
    icon: "lightbulb",
    description: "Nudge without revealing the answer",
    beforeSubmit: true,
  },
  {
    id: "formula",
    label: "Key formulas",
    icon: "functions",
    description: "Formula hints without the final answer",
    beforeSubmit: true,
    afterSubmit: true,
  },
  {
    id: "explain_basics",
    label: "Explain from basics",
    icon: "school",
    description: "Concept-first explanation",
    beforeSubmit: true,
    afterSubmit: true,
  },
  {
    id: "pitfalls",
    label: "Common mistakes & pattern",
    icon: "error_outline",
    description: "Typical NEET traps and recurring solution pattern",
    beforeSubmit: true,
    afterSubmit: true,
  },
  {
    id: "weak_chapter_analysis",
    label: "Weak chapter analysis",
    icon: "analytics",
    description: "AI read on your weakest chapters",
    global: true,
  },
  {
    id: "practice_from_weak",
    label: "Practice from weak areas",
    icon: "bolt",
    description: "Focused drill plan + quick start",
    global: true,
  },
  {
    id: "revision_notes",
    label: "Revision notes",
    icon: "note_alt",
    description: "Compact notes for this PYQ",
    afterSubmit: true,
    global: true,
  },
  {
    id: "mentor",
    label: "AI mentor",
    icon: "psychology",
    description: "Weekly study coach (not chat)",
    global: true,
  },
  {
    id: "similar_questions",
    label: "Similar questions",
    icon: "library_books",
    description: "Related PYQs from the bank",
    beforeSubmit: true,
    afterSubmit: true,
  },
];

export function featuresForQuestionContext(opts: {
  submitted: boolean;
  correct: boolean | null;
  globalOnly?: boolean;
  formulaRelevant?: boolean;
}) {
  if (opts.globalOnly) {
    return PRACTICE_AI_FEATURES.filter((f) => f.global);
  }
  return PRACTICE_AI_FEATURES.filter((f) => {
    if (f.id === "formula" && opts.formulaRelevant === false) return false;
    if (f.global) return false;
    if (!opts.submitted && f.beforeSubmit) return true;
    if (opts.submitted && opts.correct === false && f.afterWrong) return true;
    if (opts.submitted && f.afterSubmit) return true;
    return false;
  });
}

export function globalPracticeAiFeatures() {
  return PRACTICE_AI_FEATURES.filter((f) => f.global);
}
