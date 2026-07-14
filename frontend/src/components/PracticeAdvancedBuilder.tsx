import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { PackSummary, QuestionSetMode } from "../api";
import HintTooltip from "./HintTooltip";
import { PRACTICE_MODE_HINT } from "../navigation/modeHints";
import {
  clampPracticeQuestionCount,
  estimatedDrillMinutes,
  MAX_PRACTICE_QUESTIONS,
  MIN_PRACTICE_QUESTIONS,
} from "../utils/practiceHub";

type Props = {
  packId: string;
  subject: string;
  chapter: string;
  adaptive: boolean;
  questionSet: QuestionSetMode;
  questionCount: number;
  poolMax: number;
  sessionSize: number;
  packs: PackSummary[];
  selectedPack: PackSummary | undefined;
  busy: boolean;
  error: string;
  onPackId: (id: string) => void;
  onSubject: (v: string) => void;
  onChapter: (v: string) => void;
  onAdaptive: (v: boolean) => void;
  onQuestionSet: (v: QuestionSetMode) => void;
  onQuestionCount: (v: number) => void;
  onStart: () => void;
};

export default function PracticeAdvancedBuilder({
  packId,
  subject,
  chapter,
  adaptive,
  questionSet,
  questionCount,
  poolMax,
  sessionSize,
  packs,
  selectedPack,
  busy,
  error,
  onPackId,
  onSubject,
  onChapter,
  onAdaptive,
  onQuestionSet,
  onQuestionCount,
  onStart,
}: Props) {
  const inputMax = Math.min(MAX_PRACTICE_QUESTIONS, poolMax);
  const estMinutes = estimatedDrillMinutes(sessionSize);

  const subjectCount =
    subject && selectedPack?.facets?.subjects
      ? selectedPack.facets.subjects.find((s) => s.name === subject)?.count
      : null;

  const chapterCount =
    subject &&
    chapter &&
    selectedPack?.facets?.chapters
      ? selectedPack.facets.chapters.find((c) => c.subject === subject && c.chapter === chapter)?.count
      : null;

  const chapterOptions =
    selectedPack?.facets?.chapters?.filter((c) => c.subject === subject) ?? [];

  const questionSetLabel =
    questionSet === "variants"
      ? "AI variants"
      : questionSet === "all"
        ? "PYQ + variants"
        : "Original PYQ";

  const variantCount = selectedPack?.facets?.variant_count ?? 0;

  const previewScope = [
    selectedPack ? `NEET ${selectedPack.year}` : "NEET",
    subject || "All subjects",
    chapter || "All chapters",
    questionSetLabel,
  ].join(" · ");

  const previewMeta = [
    `${sessionSize} Questions`,
    adaptive ? "Adaptive" : "Fixed order",
    `~${estMinutes} min`,
  ].join(" · ");

  const [countDraft, setCountDraft] = useState(String(sessionSize));
  const [countFocused, setCountFocused] = useState(false);

  useEffect(() => {
    if (!countFocused) {
      setCountDraft(String(sessionSize));
    }
  }, [sessionSize, countFocused]);

  function stepCount(delta: number) {
    const next = clampPracticeQuestionCount(questionCount + delta, poolMax);
    onQuestionCount(next);
    setCountDraft(String(next));
  }

  function commitCountDraft(raw: string) {
    const parsed = Number.parseInt(raw.trim(), 10);
    if (!Number.isFinite(parsed)) {
      const fallback = clampPracticeQuestionCount(sessionSize, poolMax);
      onQuestionCount(fallback);
      setCountDraft(String(fallback));
      return;
    }
    const clamped = clampPracticeQuestionCount(parsed, poolMax);
    onQuestionCount(clamped);
    setCountDraft(String(clamped));
  }

  function onCountInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (value === "" || /^\d+$/.test(value)) {
      setCountDraft(value);
    }
  }

  function onCountInputBlur() {
    setCountFocused(false);
    commitCountDraft(countDraft);
  }

  function onCountInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  }

  return (
    <section className="practice-advanced glass-card" aria-label="Custom session">
      <header className="practice-advanced__head">
        <span className="practice-advanced__head-left">
          <span className="material-symbols-outlined">tune</span>
          Custom session
          <HintTooltip text={PRACTICE_MODE_HINT} />
        </span>
      </header>

      <div className="practice-advanced__body">
        <div className="practice-advanced__field">
          <label className="practice-advanced__label" htmlFor="practice-pack">
            Year / pack
          </label>
          <div className="practice-advanced__select-wrap">
            <select
              id="practice-pack"
              className="practice-advanced__select"
              value={packId}
              onChange={(e) => onPackId(e.target.value)}
            >
              {packs.map((p) => (
                <option key={p.packId} value={p.packId}>
                  NEET {p.year}
                </option>
              ))}
            </select>
            <span className="practice-advanced__meta">
              {selectedPack ? `${selectedPack.questionCount} questions in pack` : "Select a pack"}
            </span>
          </div>
        </div>

        <div className="practice-advanced__field">
          <span className="practice-advanced__label">Question set</span>
          <div className="practice-advanced__subject-pills" role="group" aria-label="Question set">
            <button
              type="button"
              className={`practice-advanced__subject-pill${questionSet === "pyq" ? " is-active" : ""}`}
              onClick={() => onQuestionSet("pyq")}
            >
              Original PYQ
            </button>
            <button
              type="button"
              className={`practice-advanced__subject-pill${questionSet === "variants" ? " is-active" : ""}`}
              onClick={() => onQuestionSet("variants")}
              disabled={variantCount === 0}
            >
              AI variants
            </button>
            <button
              type="button"
              className={`practice-advanced__subject-pill${questionSet === "all" ? " is-active" : ""}`}
              onClick={() => onQuestionSet("all")}
              disabled={variantCount === 0}
            >
              Both
            </button>
          </div>
          <span className="practice-advanced__meta">
            {variantCount > 0
              ? `${variantCount} AI practice variants available`
              : "AI variants aren’t available for this pack yet"}
          </span>
        </div>

        {selectedPack?.facets?.subjects && (
          <div className="practice-advanced__field">
            <span className="practice-advanced__label">Subject</span>
            <div className="practice-advanced__subject-pills" role="group" aria-label="Subject filter">
              <button
                type="button"
                className={`practice-advanced__subject-pill${subject === "" ? " is-active" : ""}`}
                onClick={() => onSubject("")}
              >
                All
              </button>
              {selectedPack.facets.subjects.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  className={`practice-advanced__subject-pill${subject === s.name ? " is-active" : ""}`}
                  onClick={() => onSubject(s.name)}
                >
                  {s.name}
                </button>
              ))}
            </div>
            <span className="practice-advanced__meta">
              {subjectCount != null
                ? `${subjectCount} questions in ${subject}`
                : `${selectedPack.questionCount} questions · full paper`}
            </span>
          </div>
        )}

        {selectedPack?.facets?.chapters && subject && (
          <div className="practice-advanced__field">
            <label className="practice-advanced__label" htmlFor="practice-chapter">
              Chapter
            </label>
            <div className="practice-advanced__select-wrap">
              <select
                id="practice-chapter"
                className="practice-advanced__select"
                value={chapter}
                onChange={(e) => onChapter(e.target.value)}
              >
                <option value="">All chapters</option>
                {chapterOptions.map((c) => (
                  <option key={`${c.subject}-${c.chapter}`} value={c.chapter}>
                    {c.chapter}
                  </option>
                ))}
              </select>
              <span className="practice-advanced__meta">
                {chapterCount != null
                  ? `${chapterCount} available`
                  : `${chapterOptions.length} chapters · ${subjectCount ?? poolMax} available`}
              </span>
            </div>
          </div>
        )}

        <div className="practice-advanced__controls">
          <div className="practice-advanced__stepper-block">
            <span className="practice-advanced__label">Questions</span>
            <div className="practice-advanced__stepper" role="group" aria-label="Question count">
              <button
                type="button"
                className="practice-advanced__stepper-btn"
                aria-label="Decrease question count"
                disabled={sessionSize <= MIN_PRACTICE_QUESTIONS}
                onClick={() => stepCount(-1)}
              >
                <span className="material-symbols-outlined">remove</span>
              </button>
              <input
                id="practice-question-count"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="practice-advanced__stepper-input"
                aria-label="Question count"
                value={countDraft}
                onFocus={() => setCountFocused(true)}
                onChange={onCountInputChange}
                onBlur={onCountInputBlur}
                onKeyDown={onCountInputKeyDown}
              />
              <button
                type="button"
                className="practice-advanced__stepper-btn"
                aria-label="Increase question count"
                disabled={sessionSize >= inputMax}
                onClick={() => stepCount(1)}
              >
                <span className="material-symbols-outlined">add</span>
              </button>
            </div>
            <p className="practice-advanced__meta">
              ~{estMinutes} min estimated · {MIN_PRACTICE_QUESTIONS}–{inputMax} allowed
            </p>
          </div>

          <div className="practice-advanced__switch-row">
            <span className="practice-advanced__switch-label">Adaptive Difficulty</span>
            <button
              type="button"
              role="switch"
              className={`practice-advanced__switch${adaptive ? " is-on" : ""}`}
              aria-checked={adaptive}
              onClick={() => onAdaptive(!adaptive)}
            >
              <span className="practice-advanced__switch-track">
                <span className="practice-advanced__switch-thumb" />
              </span>
              <span className="practice-advanced__switch-state">{adaptive ? "ON" : "OFF"}</span>
            </button>
          </div>
        </div>

        <div className="practice-advanced__preview" aria-label="Session preview">
          <span className="practice-advanced__preview-line">{previewScope}</span>
          <span className="practice-advanced__preview-line practice-advanced__preview-line--meta">
            {previewMeta}
          </span>
        </div>

        {error && <p className="error-text practice-advanced__error">{error}</p>}

        <button
          type="button"
          className="btn primary btn-block practice-advanced__start"
          onClick={onStart}
          disabled={busy || !packId}
        >
          {busy ? "Starting…" : "Start Practice Session"}
          {!busy && <span className="material-symbols-outlined">arrow_forward</span>}
        </button>

        <p className="muted practice-note practice-advanced__foot">
          <Link to="/practice?exam=NEET#question-bank">Browse PYQs</Link>
        </p>
      </div>
    </section>
  );
}
