import { useEffect, useMemo, useState } from "react";
import { buildTypewriterUnits } from "../utils/typewriterUnits";

type Options = {
  /** Milliseconds between character reveals (math blocks appear in one step). */
  speedMs?: number;
  /** Chars revealed per tick for faster streaming on long answers. */
  charsPerTick?: number;
  enabled?: boolean;
};

export function useTypewriterText(text: string, options: Options = {}) {
  const { speedMs = 7, charsPerTick = 2, enabled = true } = options;
  const units = useMemo(() => buildTypewriterUnits(text), [text]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [text]);

  useEffect(() => {
    if (!enabled) {
      setIndex(units.length);
      return;
    }
    if (index >= units.length) return;

    let delay = speedMs;
    const current = units[index];
    if (current.startsWith("$")) {
      delay = Math.min(speedMs * 2, 24);
    } else if (current === "\n") {
      delay = speedMs * 3;
    } else if (/[.!?]/.test(current)) {
      delay = speedMs * 4;
    }

    const id = window.setTimeout(() => {
      setIndex((prev) => Math.min(prev + (current.startsWith("$") ? 1 : charsPerTick), units.length));
    }, delay);

    return () => clearTimeout(id);
  }, [enabled, index, units, speedMs, charsPerTick]);

  const visibleText = useMemo(() => {
    if (!enabled) return text;
    return units.slice(0, index).join("");
  }, [enabled, text, units, index]);
  const complete = !enabled || index >= units.length;

  return { visibleText, complete, units };
}
