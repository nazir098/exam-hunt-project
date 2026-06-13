import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchPracticeAiStatus,
  practiceAiAssist,
  type PracticeAiAssistResponse,
  type PracticeAiFeature,
} from "../api";
import { useAuth } from "../auth/AuthContext";
import { usePlatformSettings } from "../settings/PlatformSettingsContext";
import { PRACTICE_AI_FEATURES } from "../utils/practiceAiFeatures";
import AiStreamingMarkdown from "./AiStreamingMarkdown";

type Props = {
  questionId?: string;
  selectedAnswer?: string;
  submitted?: boolean;
  correct?: boolean | null;
  formulaRelevant?: boolean;
  /** Only show features matching this filter */
  featureIds?: PracticeAiFeature[];
  compact?: boolean;
  className?: string;
  title?: string;
};

export default function PracticeAiPanel({
  questionId,
  selectedAnswer,
  submitted = false,
  correct = null,
  formulaRelevant = true,
  featureIds,
  compact,
  className = "",
  title = "AI practice coach",
}: Props) {
  const { user } = useAuth();
  const { settings } = usePlatformSettings();
  const [busy, setBusy] = useState<PracticeAiFeature | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PracticeAiAssistResponse | null>(null);
  const [statusOk, setStatusOk] = useState<boolean | null>(null);

  const available = settings.aiSuggestEnabled && settings.aiLlmConfigured;

  useEffect(() => {
    setResult(null);
    setError("");
  }, [questionId, submitted, correct, selectedAnswer]);

  const features = useMemo(() => {
    let list = PRACTICE_AI_FEATURES;
    if (featureIds?.length) {
      list = list.filter((f) => featureIds.includes(f.id) && (f.id !== "formula" || formulaRelevant));
    } else if (questionId) {
      list = list.filter((f) => {
        if (f.id === "formula" && !formulaRelevant) return false;
        if (f.global) return false;
        if (!submitted && f.beforeSubmit) return true;
        if (submitted && correct === false && f.afterWrong) return true;
        if (submitted && f.afterSubmit) return true;
        return false;
      });
    }
    return list;
  }, [featureIds, questionId, submitted, correct, formulaRelevant]);

  const checkStatus = useCallback(async () => {
    try {
      const s = await fetchPracticeAiStatus();
      setStatusOk(s.available);
    } catch {
      setStatusOk(false);
    }
  }, []);

  async function run(feature: PracticeAiFeature) {
    if (!user) {
      setError("Sign in to use AI practice features.");
      return;
    }
    setBusy(feature);
    setError("");
    try {
      if (statusOk === null) await checkStatus();
      const res = await practiceAiAssist({
        feature,
        questionId,
        selectedAnswer: submitted ? selectedAnswer : undefined,
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI request failed");
      setResult(null);
    } finally {
      setBusy(null);
    }
  }

  if (!available) {
    return (
      <section className="practice-ai-panel practice-ai-panel--off glass-card">
        <p className="practice-ai-panel__title">{title}</p>
        <p className="text-caption text-outline">
          AI practice is off — add <code>OPENAI_API_KEY</code> to <code>.env</code> and start FreeLLMAPI
          (port 3001), or enable AI in admin settings.
        </p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="practice-ai-panel glass-card">
        <p className="practice-ai-panel__title">{title}</p>
        <p className="text-body-sm text-on-surface-variant mb-md">
          Sign in to get hints, wrong-answer breakdowns, and weak-area coaching.
        </p>
        <Link to="/login" className="btn btn-sm primary">
          Sign in
        </Link>
      </section>
    );
  }

  return (
    <section
      className={
        "practice-ai-panel glass-card" +
        (compact ? " practice-ai-panel--compact" : "") +
        (className ? ` ${className}` : "")
      }
    >
      <p className="practice-ai-panel__title">{title}</p>
      <p className="practice-ai-panel__sub text-caption text-outline">
        Powered by FreeLLMAPI · focused on practice, not open chat
      </p>

      <div className="practice-ai-panel__actions">
        {features.map((f) => (
          <button
            key={f.id}
            type="button"
            className="practice-ai-action"
            disabled={!!busy}
            onClick={() => run(f.id)}
            title={f.description}
          >
            <span className="material-symbols-outlined">{f.icon}</span>
            <span className="practice-ai-action__label">{f.label}</span>
            {busy === f.id && <span className="practice-ai-action__spin" aria-hidden />}
          </button>
        ))}
      </div>

      {error && <p className="error-text practice-ai-panel__error">{error}</p>}

      {result && (
        <div className="practice-ai-panel__result">
          <p className="practice-ai-panel__result-label">
            {PRACTICE_AI_FEATURES.find((x) => x.id === result.feature)?.label || result.feature}
          </p>
          <div className="practice-ai-panel__result-text">
            <AiStreamingMarkdown text={result.text} />
          </div>

          {result.similarQuestions.length > 0 && (
            <ul className="practice-ai-similar-list">
              {result.similarQuestions.map((s) => (
                <li key={s.questionId}>
                  <Link to={`/question/${s.questionId}`}>
                    Q{s.questionNo} · {s.chapter || s.subject}
                    {s.questionTextPreview ? ` — ${s.questionTextPreview.slice(0, 60)}…` : ""}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {result.actionUrl && (
            <Link to={result.actionUrl} className="btn btn-sm primary practice-ai-panel__cta">
              Go →
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
