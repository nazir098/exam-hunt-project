import { useLayoutEffect } from "react";
import { scrollQuestionMainIntoView } from "../utils/scrollQuestionIntoView";

/**
 * When the active question changes (or first loads), scroll so the main
 * question card is visible under the sticky app header.
 */
export function useScrollQuestionIntoView(
  questionKey: string | null | undefined,
  ready = true
) {
  useLayoutEffect(() => {
    if (!questionKey || !ready) return;

    scrollQuestionMainIntoView("auto");
    // Second pass after chrome/toolbar paint (variant switcher, fonts).
    const frame = window.requestAnimationFrame(() => {
      scrollQuestionMainIntoView("auto");
    });
    const timer = window.setTimeout(() => scrollQuestionMainIntoView("auto"), 80);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [questionKey, ready]);
}
