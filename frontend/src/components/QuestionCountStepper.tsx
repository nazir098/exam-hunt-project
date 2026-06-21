import { useEffect, useState } from "react";
import {
  clampPracticeQuestionCount,
  MAX_PRACTICE_QUESTIONS,
  MIN_PRACTICE_QUESTIONS,
} from "../utils/practiceHub";

type Props = {
  value: number;
  poolMax: number;
  onChange: (value: number) => void;
  id?: string;
};

export default function QuestionCountStepper({ value, poolMax, onChange, id = "bank-question-count" }: Props) {
  const sessionSize = clampPracticeQuestionCount(value, poolMax);
  const inputMax = Math.min(MAX_PRACTICE_QUESTIONS, poolMax);
  const [draft, setDraft] = useState(String(sessionSize));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(String(sessionSize));
  }, [sessionSize, focused]);

  function step(delta: number) {
    const next = clampPracticeQuestionCount(sessionSize + delta, poolMax);
    onChange(next);
    setDraft(String(next));
  }

  function commit(raw: string) {
    const parsed = Number.parseInt(raw.trim(), 10);
    if (!Number.isFinite(parsed)) {
      const fallback = clampPracticeQuestionCount(sessionSize, poolMax);
      onChange(fallback);
      setDraft(String(fallback));
      return;
    }
    const clamped = clampPracticeQuestionCount(parsed, poolMax);
    onChange(clamped);
    setDraft(String(clamped));
  }

  return (
    <div className="practice-bank-count">
      <label className="text-caption text-outline mb-2 block" htmlFor={id}>
        Number of questions
      </label>
      <div className="practice-bank-count__row">
        <button
          type="button"
          className="practice-bank-count__step"
          aria-label="Fewer questions"
          disabled={sessionSize <= MIN_PRACTICE_QUESTIONS}
          onClick={() => step(-5)}
        >
          <span className="material-symbols-outlined">remove</span>
        </button>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          className="practice-bank-count__input"
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "" || /^\d+$/.test(v)) setDraft(v);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            commit(draft);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          aria-valuemin={MIN_PRACTICE_QUESTIONS}
          aria-valuemax={inputMax}
          aria-valuenow={sessionSize}
        />
        <button
          type="button"
          className="practice-bank-count__step"
          aria-label="More questions"
          disabled={sessionSize >= inputMax}
          onClick={() => step(5)}
        >
          <span className="material-symbols-outlined">add</span>
        </button>
      </div>
      <p className="practice-bank-count__hint muted">
        {MIN_PRACTICE_QUESTIONS}–{inputMax} questions
      </p>
    </div>
  );
}
