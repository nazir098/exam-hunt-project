/** Selector for the main question card (practice / solve / review). */
export const QUESTION_MAIN_SELECTOR = "[data-question-main]";

/**
 * Align the question card to the top of the viewport (under sticky chrome).
 * Call when landing on or jumping between questions.
 */
export function scrollQuestionMainIntoView(behavior: ScrollBehavior = "auto") {
  const el = document.querySelector<HTMLElement>(QUESTION_MAIN_SELECTOR);
  if (!el) return;
  el.scrollIntoView({ behavior, block: "start" });
}
