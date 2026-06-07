import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { PackSummary } from "../api";
import HintTooltip from "./HintTooltip";
import { TEST_MODE_HINT } from "../navigation/modeHints";
import {
  clampPracticeQuestionCount,
  MAX_PRACTICE_QUESTIONS,
  MIN_PRACTICE_QUESTIONS,
} from "../utils/practiceHub";

const DIFFICULTY_OPTIONS = [
  { value: "", label: "Mixed" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
] as const;

const COUNT_PRESETS = [45, 90, 180] as const;

type Props = {
  packId: string;
  subject: string;
  chapter: string;
  difficulty: string;
  questionCount: number;
  sessionSize: number;
  poolMax: number;
  estMinutes: number;
  packs: PackSummary[];
  selectedPack: PackSummary | undefined;
  busy: boolean;
  error: string;
  onPackId: (id: string) => void;
  onSubject: (v: string) => void;
  onChapter: (v: string) => void;
  onDifficulty: (v: string) => void;
  onQuestionCount: (v: number) => void;
  onSubmit: (e: FormEvent) => void;
};

export default function TestSessionBuilder({
  packId,
  subject,
  chapter,
  difficulty,
  questionCount,
  sessionSize,
  poolMax,
  estMinutes,
  packs,
  selectedPack,
  busy,
  error,
  onPackId,
  onSubject,
  onChapter,
  onDifficulty,
  onQuestionCount,
  onSubmit,
}: Props) {
  const inputMax = Math.min(MAX_PRACTICE_QUESTIONS, poolMax);

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

  const previewScope = [
    selectedPack ? `NEET ${selectedPack.year}` : "NEET",
    subject || "All subjects",
    chapter || "All chapters",
  ].join(" · ");

  const difficultyLabel =
    DIFFICULTY_OPTIONS.find((o) => o.value === difficulty)?.label ?? "Mixed";

  const previewMeta = [
    `${sessionSize} Questions`,
    difficultyLabel,
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

  function applyPreset(value: number) {
    const next = clampPracticeQuestionCount(value, poolMax);
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
      e.preventDefault();
      e.currentTarget.blur();
    }
  }

  return (
    <form className="practice-advanced glass-card test-builder" onSubmit={onSubmit} aria-label="Configure test">
      <header className="practice-advanced__head">
        <span className="practice-advanced__head-left">
          <span className="material-symbols-outlined">quiz</span>
          Configure test
          <HintTooltip text={TEST_MODE_HINT} />
        </span>
      </header>

      <div className="practice-advanced__body">
        <div className="test-builder__grid">
          <div className="practice-advanced__field">
            <label className="practice-advanced__label" htmlFor="test-pack">
              Year / pack
            </label>
            <div className="practice-advanced__select-wrap">
              <select
                id="test-pack"
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

          {selectedPack?.facets?.subjects && (
            <div className="practice-advanced__field">
              <label className="practice-advanced__label" htmlFor="test-subject">
                Subject
              </label>
              <div className="practice-advanced__select-wrap">
                <select
                  id="test-subject"
                  className="practice-advanced__select"
                  value={subject}
                  onChange={(e) => onSubject(e.target.value)}
                >
                  <option value="">All subjects</option>
                  {selectedPack.facets.subjects.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <span className="practice-advanced__meta">
                  {subjectCount != null
                    ? `${subjectCount} available`
                    : `${selectedPack.questionCount} available`}
                </span>
              </div>
            </div>
          )}

          {selectedPack?.facets?.chapters && subject && (
            <div className="practice-advanced__field test-builder__field--wide">
              <label className="practice-advanced__label" htmlFor="test-chapter">
                Chapter
              </label>
              <div className="practice-advanced__select-wrap">
                <select
                  id="test-chapter"
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

          <div className="practice-advanced__field test-builder__field--wide">
            <span className="practice-advanced__label">Difficulty</span>
            <div className="session-chip-row" role="radiogroup" aria-label="Difficulty">
              {DIFFICULTY_OPTIONS.map((opt) => (
                <button
                  key={opt.value || "mixed"}
                  type="button"
                  role="radio"
                  aria-checked={difficulty === opt.value}
                  className={`session-chip${difficulty === opt.value ? " is-active" : ""}`}
                  onClick={() => onDifficulty(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="practice-advanced__controls">
          <div className="practice-advanced__stepper-block">
            <span className="practice-advanced__label">Questions</span>
            <div className="session-chip-row session-chip-row--compact">
              {COUNT_PRESETS.map((preset) => {
                const active = sessionSize === clampPracticeQuestionCount(preset, poolMax);
                const disabled = preset > inputMax;
                return (
                  <button
                    key={preset}
                    type="button"
                    className={`session-chip session-chip--compact${active ? " is-active" : ""}`}
                    disabled={disabled}
                    onClick={() => applyPreset(preset)}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
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
                id="test-question-count"
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
              ~{estMinutes} min timed · {MIN_PRACTICE_QUESTIONS}–{inputMax} allowed
            </p>
          </div>
        </div>

        <div className="practice-advanced__preview" aria-label="Test preview">
          <span className="practice-advanced__preview-line">{previewScope}</span>
          <span className="practice-advanced__preview-line practice-advanced__preview-line--meta">
            {previewMeta}
          </span>
        </div>

        {error && <p className="error-text practice-advanced__error">{error}</p>}

        <button
          type="submit"
          className="btn primary btn-block practice-advanced__start"
          disabled={busy || !packId}
        >
          {busy ? "Building test…" : "Start NEET Test"}
          {!busy && <span className="material-symbols-outlined">arrow_forward</span>}
        </button>

        <p className="muted practice-note practice-advanced__foot">
          <Link to="/practice">Practice mode</Link> counts toward rank ·{" "}
          <Link to="/bank?exam=NEET">Browse PYQs</Link> for untimed study
        </p>
      </div>
    </form>
  );
}
