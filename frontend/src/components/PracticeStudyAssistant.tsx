import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchPracticeAiStatus,
  practiceAiAssist,
  type PracticeAiAssistResponse,
  type PracticeAiFeature,
} from "../api";
import { useAuth } from "../auth/AuthContext";
import { usePlatformSettings } from "../settings/PlatformSettingsContext";
import AiMarkdown from "./AiMarkdown";

type TabDef = {
  id: PracticeAiFeature;
  label: string;
  short: string;
  icon: string;
};

type Props = {
  questionId: string;
  selectedAnswer?: string;
  submitted?: boolean;
  correct?: boolean | null;
  prominent?: boolean;
  layout: "sidebar" | "inline";
  /** Hide Formula tab when the PYQ is concept-only (no LLM call needed). */
  formulaRelevant?: boolean;
};

const FORMULA_TAB: TabDef = { id: "formula", label: "Formula", short: "Formula", icon: "functions" };

const BEFORE_TABS_BASE: TabDef[] = [
  { id: "hint", label: "Hint", short: "Hint", icon: "lightbulb" },
  { id: "explain_basics", label: "Basics", short: "Basics", icon: "school" },
  { id: "similar_questions", label: "Similar Questions", short: "Similar", icon: "library_books" },
];

function buildTabs(includeFormula: boolean, submitted: boolean, correct: boolean | null | undefined): TabDef[] {
  const formula = includeFormula ? [FORMULA_TAB] : [];
  if (!submitted) {
    return [
      BEFORE_TABS_BASE[0],
      BEFORE_TABS_BASE[1],
      ...formula,
      BEFORE_TABS_BASE[2],
    ];
  }
  if (correct === false) {
    return [
      { id: "why_wrong", label: "AI Explanation", short: "Explain", icon: "psychology" },
      BEFORE_TABS_BASE[1],
      ...formula,
      BEFORE_TABS_BASE[2],
    ];
  }
  return [
    { id: "revision_notes", label: "AI Explanation", short: "Explain", icon: "psychology" },
    BEFORE_TABS_BASE[1],
    ...formula,
    BEFORE_TABS_BASE[2],
  ];
}

const HINT_STEP_COUNT = 3;
/** Fake delay before revealing cached hint steps 2 & 3 */
const HINT_REVEAL_MS_MIN = 1200;
const HINT_REVEAL_MS_MAX = 1800;

function resolveHintSteps(res: PracticeAiAssistResponse): string[] {
  const raw = res.hintSteps?.map((s) => s.trim()).filter(Boolean) ?? [];
  const unique: string[] = [];
  for (const s of raw) {
    if (!unique.some((u) => u.toLowerCase() === s.toLowerCase())) {
      unique.push(s);
    }
  }
  if (unique.length >= HINT_STEP_COUNT) {
    return unique.slice(0, HINT_STEP_COUNT);
  }
  if (unique.length > 0) {
    return unique;
  }
  return res.text?.trim() ? [res.text.trim()] : [];
}

function hintRevealDelayMs() {
  return HINT_REVEAL_MS_MIN + Math.floor(Math.random() * (HINT_REVEAL_MS_MAX - HINT_REVEAL_MS_MIN));
}

export default function PracticeStudyAssistant({
  questionId,
  selectedAnswer,
  submitted = false,
  correct = null,
  prominent = false,
  layout,
  formulaRelevant = true,
}: Props) {
  const { user } = useAuth();
  const { settings, loading: settingsLoading } = usePlatformSettings();
  const available = settings.aiSuggestEnabled;
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tabs = useMemo(
    () => buildTabs(formulaRelevant, submitted, correct),
    [formulaRelevant, submitted, correct]
  );

  const [collapsed, setCollapsed] = useState(!prominent);
  const [activeTab, setActiveTab] = useState<PracticeAiFeature | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [busy, setBusy] = useState<PracticeAiFeature | null>(null);
  const [error, setError] = useState("");
  const [results, setResults] = useState<Partial<Record<PracticeAiFeature, PracticeAiAssistResponse>>>({});
  const [statusOk, setStatusOk] = useState<boolean | null>(null);
  const [hintStep, setHintStep] = useState(1);
  const [hintRevealing, setHintRevealing] = useState(false);

  useEffect(() => {
    setResults({});
    setError("");
    setActiveTab(null);
    setPanelOpen(false);
    setCollapsed(!prominent);
    setHintStep(1);
    setHintRevealing(false);
  }, [questionId, submitted, correct, prominent]);

  useEffect(() => {
    if (!formulaRelevant && activeTab === "formula") {
      setActiveTab(null);
      setPanelOpen(false);
    }
  }, [formulaRelevant, activeTab]);

  useEffect(() => {
    if (prominent) {
      setCollapsed(false);
    }
  }, [prominent]);

  useEffect(
    () => () => {
      if (revealTimer.current) clearTimeout(revealTimer.current);
    },
    []
  );

  const checkStatus = useCallback(async () => {
    try {
      const s = await fetchPracticeAiStatus();
      setStatusOk(s.available);
    } catch {
      setStatusOk(false);
    }
  }, []);

  const runTab = useCallback(
    async (feature: PracticeAiFeature) => {
      if (!user) {
        setError("Sign in to use AI study features.");
        return;
      }
      setActiveTab(feature);
      setCollapsed(false);
      setPanelOpen(true);
      if (feature !== "hint") {
        setHintStep(1);
        setHintRevealing(false);
      }
      if (results[feature]) return;

      setBusy(feature);
      setError("");
      try {
        if (statusOk === null) await checkStatus();
        const res = await practiceAiAssist({
          feature,
          questionId,
          selectedAnswer: submitted ? selectedAnswer : undefined,
        });
        setResults((prev) => ({ ...prev, [feature]: res }));
        if (feature === "hint") {
          setHintStep(1);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "AI request failed");
      } finally {
        setBusy(null);
      }
    },
    [user, results, statusOk, checkStatus, questionId, submitted, selectedAnswer]
  );

  const revealNextHint = useCallback(() => {
    const cached = results.hint;
    if (!cached || hintStep >= HINT_STEP_COUNT) return;
    const steps = resolveHintSteps(cached);
    if (hintStep >= steps.length) return;

    setHintRevealing(true);
    if (revealTimer.current) clearTimeout(revealTimer.current);
    revealTimer.current = setTimeout(() => {
      setHintStep((s) => Math.min(s + 1, HINT_STEP_COUNT));
      setHintRevealing(false);
      revealTimer.current = null;
    }, hintRevealDelayMs());
  }, [results.hint, hintStep]);

  const activeResult = activeTab ? results[activeTab] : null;
  const activeTabMeta = tabs.find((t) => t.id === activeTab);
  const isHintTab = activeTab === "hint";
  const hintSteps = isHintTab && activeResult ? resolveHintSteps(activeResult) : [];
  const displayedHint =
    isHintTab && hintSteps.length > 0 ? hintSteps[Math.min(hintStep, hintSteps.length) - 1] : null;
  const showLoading = busy === activeTab || (isHintTab && hintRevealing);
  const loadingLabel =
    isHintTab && hintRevealing
      ? `Preparing hint ${hintStep + 1} of ${HINT_STEP_COUNT}…`
      : isHintTab && busy === "hint"
        ? "Generating hints…"
        : "Generating response…";
  const canShowNextHint =
    isHintTab &&
    !!activeResult &&
    !showLoading &&
    hintStep < hintSteps.length &&
    hintStep < HINT_STEP_COUNT;

  if (settingsLoading) {
    return (
      <aside className={`study-assistant study-assistant--off study-assistant--${layout}`}>
        <div className="study-assistant__head">
          <span className="material-symbols-outlined study-assistant__badge-icon">auto_awesome</span>
          <h3 className="study-assistant__title">AI Study Assistant</h3>
        </div>
        <p className="study-assistant__off-text">Checking AI availability…</p>
      </aside>
    );
  }

  if (!available) {
    return (
      <aside className={`study-assistant study-assistant--off study-assistant--${layout}`}>
        <div className="study-assistant__head">
          <span className="material-symbols-outlined study-assistant__badge-icon">auto_awesome</span>
          <h3 className="study-assistant__title">AI Study Assistant</h3>
        </div>
        <p className="study-assistant__off-text">
          {!settings.aiLlmConfigured ? (
            <>
              Start FreeLLMAPI on port <code>3001</code> and set <code>OPENAI_API_KEY</code> in{" "}
              <code>.env</code>, then restart the backend.
            </>
          ) : (
            <>AI practice is turned off in platform settings.</>
          )}
        </p>
      </aside>
    );
  }

  if (!user) {
    return (
      <aside className={`study-assistant study-assistant--${layout}`}>
        <div className="study-assistant__head">
          <span className="material-symbols-outlined study-assistant__badge-icon">auto_awesome</span>
          <h3 className="study-assistant__title">AI Study Assistant</h3>
        </div>
        <p className="study-assistant__hint">Sign in for hints, explanations, and similar PYQs.</p>
        <Link to="/login" className="study-assistant__signin">
          Sign in
        </Link>
      </aside>
    );
  }

  return (
    <aside
      className={[
        "study-assistant",
        `study-assistant--${layout}`,
        prominent ? "study-assistant--prominent" : "",
        collapsed ? "study-assistant--collapsed" : "",
        panelOpen ? "study-assistant--panel-open" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="study-assistant__head">
        <div className="study-assistant__head-left">
          <span className="material-symbols-outlined study-assistant__badge-icon">auto_awesome</span>
          <div>
            <h3 className="study-assistant__title">AI Study Assistant</h3>
            <p className="study-assistant__subtitle">Focused coaching · not open chat</p>
          </div>
        </div>
        <button
          type="button"
          className="study-assistant__toggle"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand AI assistant" : "Collapse AI assistant"}
        >
          <span className="material-symbols-outlined">
            {collapsed ? "expand_more" : "expand_less"}
          </span>
        </button>
      </div>

      <div className="study-assistant__tabs" role="tablist" aria-label="AI study tools">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id && panelOpen;
          const isLoading = busy === tab.id || (tab.id === "hint" && isActive && hintRevealing);
          return (
            <button
              key={`${tab.id}-${tab.short}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`study-assistant__tab${isActive ? " is-active" : ""}${isLoading ? " is-loading" : ""}`}
              onClick={() => runTab(tab.id)}
            >
              <span className="material-symbols-outlined">{tab.icon}</span>
              <span>{tab.short}</span>
            </button>
          );
        })}
      </div>

      <div
        className={`study-assistant__panel${panelOpen ? " is-open" : ""}`}
        aria-live="polite"
        aria-hidden={!panelOpen}
      >
        {panelOpen && activeTab && (
          <div className="study-assistant__panel-inner">
            <div className="study-assistant__panel-head">
              <span className="material-symbols-outlined">{activeTabMeta?.icon || "auto_awesome"}</span>
              <span>{activeTabMeta?.label || activeTab}</span>
              <button
                type="button"
                className="study-assistant__panel-close"
                onClick={() => setPanelOpen(false)}
                aria-label="Close panel"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {showLoading && (
              <div className="study-assistant__loading">
                <div className="study-assistant__loading-bar" />
                <div className="study-assistant__loading-bar study-assistant__loading-bar--short" />
                <div className="study-assistant__loading-bar study-assistant__loading-bar--medium" />
                <p className="study-assistant__loading-text">{loadingLabel}</p>
              </div>
            )}

            {error && !showLoading && <p className="study-assistant__error">{error}</p>}

            {activeResult && !showLoading && (
              <div className="study-assistant__content">
                {isHintTab && (
                  <div className="study-assistant__hint-progress" aria-label={`Hint ${hintStep} of ${hintSteps.length}`}>
                    {Array.from({ length: Math.min(hintSteps.length, HINT_STEP_COUNT) }, (_, i) => (
                      <span
                        key={i}
                        className={`study-assistant__hint-dot${i < hintStep ? " is-done" : ""}${i === hintStep - 1 ? " is-current" : ""}`}
                      />
                    ))}
                    <span className="study-assistant__hint-step-label">
                      Hint {hintStep} of {Math.max(hintSteps.length, 1)}
                    </span>
                  </div>
                )}

                <div className="study-assistant__text study-assistant__text--reveal">
                  <AiMarkdown
                    text={
                      isHintTab && displayedHint
                        ? displayedHint
                        : activeResult.text
                    }
                  />
                </div>

                {canShowNextHint && (
                  <button type="button" className="study-assistant__next-hint" onClick={revealNextHint}>
                    <span className="material-symbols-outlined">lightbulb</span>
                    Next hint ({hintStep + 1}/{HINT_STEP_COUNT})
                  </button>
                )}

                {isHintTab && hintStep >= hintSteps.length && hintSteps.length > 0 && (
                  <p className="study-assistant__hint-done">All hints shown — try solving, then submit.</p>
                )}

                {!isHintTab && activeResult.similarQuestions.length > 0 && (
                  <ul className="study-assistant__similar">
                    {activeResult.similarQuestions.map((s) => (
                      <li key={s.questionId}>
                        <Link to={`/question/${s.questionId}`}>
                          Q{s.questionNo} · {s.chapter || s.subject}
                          {s.questionTextPreview ? ` — ${s.questionTextPreview.slice(0, 72)}…` : ""}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {!isHintTab && activeResult.actionUrl && (
                  <Link to={activeResult.actionUrl} className="study-assistant__cta">
                    Open in bank →
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {layout === "inline" && panelOpen && (
        <div
          className="study-assistant__backdrop"
          aria-hidden
          onClick={() => setPanelOpen(false)}
        />
      )}
    </aside>
  );
}
