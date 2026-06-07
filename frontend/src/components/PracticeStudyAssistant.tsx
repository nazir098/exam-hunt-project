import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchPracticeAiStatus,
  fetchPracticeSolution,
  practiceAiAssist,
  type PracticeAiAssistResponse,
  type PracticeAiFeature,
} from "../api";
import { useAuth } from "../auth/AuthContext";
import { usePlatformSettings } from "../settings/PlatformSettingsContext";
import AiStreamingMarkdown from "./AiStreamingMarkdown";

type TabDef = {
  id: PracticeAiFeature;
  label: string;
  short: string;
  icon: string;
  tier: "primary" | "secondary";
};

type Props = {
  questionId: string;
  selectedAnswer?: string;
  submitted?: boolean;
  correct?: boolean | null;
  prominent?: boolean;
  layout: "sidebar" | "inline";
  /** Nested inside test sidebar — no outer card chrome. */
  embedded?: boolean;
  /** Hide Formula tab when the PYQ is concept-only (no LLM call needed). */
  formulaRelevant?: boolean;
  /** Whether an official solution image exists for the full-solution step. */
  hasSolution?: boolean;
  /** Parent can open a tab (e.g. from result card actions). */
  triggerFeature?: PracticeAiFeature | null;
  onTriggerConsumed?: () => void;
  /** Hide tools during an active test — results unlock after final submission. */
  examLocked?: boolean;
};

export type PracticeStudyAssistantProps = Props;

const FORMULA_TAB: TabDef = {
  id: "formula",
  label: "Formula",
  short: "Formula",
  icon: "functions",
  tier: "secondary",
};

const BEFORE_TABS_BASE: TabDef[] = [
  { id: "hint", label: "Hint", short: "Hint", icon: "lightbulb", tier: "primary" },
  { id: "explain_basics", label: "Basics", short: "Basics", icon: "school", tier: "primary" },
  {
    id: "similar_questions",
    label: "Similar Questions",
    short: "Similar",
    icon: "library_books",
    tier: "secondary",
  },
];

function buildTabs(includeFormula: boolean, submitted: boolean, correct: boolean | null | undefined): TabDef[] {
  const formulaPrimary: TabDef = { ...FORMULA_TAB, tier: "primary" };
  const formulaSecondary: TabDef = { ...FORMULA_TAB, tier: "secondary" };
  if (!submitted) {
    return [
      BEFORE_TABS_BASE[0],
      BEFORE_TABS_BASE[1],
      ...(includeFormula ? [formulaSecondary] : []),
      BEFORE_TABS_BASE[2],
    ];
  }
  if (correct === false) {
    return [
      { id: "why_wrong", label: "Explain", short: "Explain", icon: "psychology", tier: "primary" },
      BEFORE_TABS_BASE[1],
      ...(includeFormula ? [formulaPrimary] : []),
      { ...BEFORE_TABS_BASE[2], tier: "secondary" },
    ];
  }
  return [
    { id: "revision_notes", label: "Explain", short: "Explain", icon: "psychology", tier: "primary" },
    { ...BEFORE_TABS_BASE[2], tier: "primary" },
    { ...BEFORE_TABS_BASE[1], tier: "secondary" },
    ...(includeFormula ? [formulaSecondary] : []),
  ];
}

export function explainFeatureForResult(correct: boolean): PracticeAiFeature {
  return correct ? "revision_notes" : "why_wrong";
}

const HINT_STEP_COUNT = 3;

function imageSrc(url: string) {
  return url;
}

function nextHintButtonLabel(currentStep: number): string {
  if (currentStep === 1) return "Hint 2";
  if (currentStep === 2) return "Hint 3";
  return `Hint ${currentStep + 1}`;
}

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

export default function PracticeStudyAssistant({
  questionId,
  selectedAnswer,
  submitted = false,
  correct = null,
  prominent = false,
  layout,
  formulaRelevant = true,
  hasSolution = false,
  triggerFeature = null,
  onTriggerConsumed,
  examLocked = false,
  embedded = false,
}: Props) {
  const { user } = useAuth();
  const { settings, loading: settingsLoading } = usePlatformSettings();
  const available = settings.aiSuggestEnabled;

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
  const [streamComplete, setStreamComplete] = useState(false);
  const [streamEpoch, setStreamEpoch] = useState(0);
  const [solutionRevealed, setSolutionRevealed] = useState(false);
  const [solutionImageUrl, setSolutionImageUrl] = useState("");
  const [solutionBusy, setSolutionBusy] = useState(false);
  const [solutionError, setSolutionError] = useState("");
  const [solutionExpanded, setSolutionExpanded] = useState(false);

  useEffect(() => {
    setResults({});
    setError("");
    setActiveTab(null);
    setPanelOpen(false);
    setCollapsed(!prominent);
    setHintStep(1);
    setStreamComplete(false);
    setSolutionRevealed(false);
    setSolutionImageUrl("");
    setSolutionError("");
    setSolutionExpanded(false);
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
        setSolutionRevealed(false);
        setSolutionImageUrl("");
        setSolutionError("");
      }
      setStreamComplete(false);
      setStreamEpoch((e) => e + 1);
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
          setSolutionRevealed(false);
          setSolutionImageUrl("");
          setSolutionError("");
        }
        setStreamComplete(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "AI request failed");
      } finally {
        setBusy(null);
      }
    },
    [user, results, statusOk, checkStatus, questionId, submitted, selectedAnswer]
  );

  const revealNextHint = useCallback(() => {
    if (hintStep >= HINT_STEP_COUNT) return;
    setStreamComplete(false);
    setStreamEpoch((e) => e + 1);
    setHintStep((s) => Math.min(s + 1, HINT_STEP_COUNT));
  }, [hintStep]);

  const revealFullSolution = useCallback(async () => {
    if (!hasSolution || solutionRevealed) return;
    setSolutionBusy(true);
    setSolutionError("");
    try {
      const res = await fetchPracticeSolution(questionId);
      if (!res.hasSolution || !res.solutionImageUrl) {
        setSolutionError("No official solution is available for this question.");
        return;
      }
      setSolutionImageUrl(res.solutionImageUrl);
      setSolutionRevealed(true);
    } catch (e) {
      setSolutionError(e instanceof Error ? e.message : "Could not load solution");
    } finally {
      setSolutionBusy(false);
    }
  }, [hasSolution, questionId, solutionRevealed]);

  useEffect(() => {
    if (!triggerFeature) return;
    void runTab(triggerFeature).finally(() => onTriggerConsumed?.());
  }, [triggerFeature, onTriggerConsumed, runTab]);

  const primaryTabs = tabs.filter((t) => t.tier === "primary");
  const secondaryTabs = tabs.filter((t) => t.tier === "secondary");

  const renderTab = (tab: TabDef) => {
    const isActive = activeTab === tab.id && panelOpen;
    const isLoading = busy === tab.id;
    return (
      <button
        key={`${tab.id}-${tab.short}-${tab.tier}`}
        type="button"
        role="tab"
        aria-selected={isActive}
        className={[
          "study-assistant__tab",
          tab.tier === "primary" ? "study-assistant__tab--primary" : "study-assistant__tab--secondary",
          isActive ? "is-active" : "",
          isLoading ? "is-loading" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => runTab(tab.id)}
      >
        <span className="material-symbols-outlined">{tab.icon}</span>
        <span>{tab.short}</span>
      </button>
    );
  };

  const activeResult = activeTab ? results[activeTab] : null;
  const activeTabMeta = tabs.find((t) => t.id === activeTab);
  const isHintTab = activeTab === "hint";
  const hintSteps = isHintTab && activeResult ? resolveHintSteps(activeResult) : [];
  const effectiveHintCount = Math.min(hintSteps.length, HINT_STEP_COUNT);
  const displayedHint =
    isHintTab && hintSteps.length > 0 && !solutionRevealed
      ? hintSteps[Math.min(hintStep, hintSteps.length) - 1]
      : null;
  const streamText =
    isHintTab && displayedHint ? displayedHint : activeResult?.text ?? "";
  const streamKey = `${activeTab ?? "none"}-${isHintTab ? hintStep : 0}-${questionId}-${streamEpoch}`;
  const showLoading = busy === activeTab;
  const loadingLabel =
    isHintTab && busy === "hint" ? "Generating hints…" : "Generating response…";
  const allHintsShown =
    isHintTab && !!activeResult && streamComplete && hintStep >= effectiveHintCount && effectiveHintCount > 0;
  const canShowNextHint =
    isHintTab &&
    !!activeResult &&
    !showLoading &&
    !solutionRevealed &&
    streamComplete &&
    hintStep < effectiveHintCount;
  const canShowFullSolution =
    isHintTab &&
    hasSolution &&
    !!activeResult &&
    !showLoading &&
    !solutionRevealed &&
    allHintsShown;

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

  if (examLocked) {
    return (
      <aside
        className={[
          "study-assistant",
          "study-assistant--off",
          "study-assistant--exam-locked",
          `study-assistant--${layout}`,
          embedded ? "study-assistant--embedded" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="study-assistant__head">
          <span className="material-symbols-outlined study-assistant__badge-icon">auto_awesome</span>
          <div>
            <h3 className="study-assistant__title">AI Study Assistant</h3>
            <p className="study-assistant__subtitle">Exam simulation</p>
          </div>
        </div>
        <p className="study-assistant__off-text">Available after test submission.</p>
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
        {submitted ? (
          <div className="study-assistant__tabs-row study-assistant__tabs-row--uniform">
            {tabs.map((tab) => renderTab({ ...tab, tier: "primary" }))}
          </div>
        ) : (
          <>
            <div className="study-assistant__tabs-row study-assistant__tabs-row--primary">
              {primaryTabs.map(renderTab)}
            </div>
            {secondaryTabs.length > 0 && (
              <div className="study-assistant__tabs-row study-assistant__tabs-row--secondary">
                {secondaryTabs.map(renderTab)}
              </div>
            )}
          </>
        )}
      </div>

      <div
        className={`study-assistant__panel${panelOpen ? " is-open" : ""}`}
        aria-live="polite"
        aria-hidden={!panelOpen}
      >
        {panelOpen && activeTab && (
          <div
            className={`study-assistant__panel-inner${
              isHintTab && solutionRevealed && solutionImageUrl ? " study-assistant__panel-inner--solution" : ""
            }`}
          >
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
                {isHintTab && !solutionRevealed && (
                  <div
                    className="study-assistant__hint-progress"
                    aria-label={`Hint ${Math.min(hintStep, effectiveHintCount)} of ${effectiveHintCount}`}
                  >
                    {Array.from({ length: effectiveHintCount }, (_, i) => (
                      <span
                        key={i}
                        className={`study-assistant__hint-dot${i < hintStep ? " is-done" : ""}${i === hintStep - 1 ? " is-current" : ""}`}
                      />
                    ))}
                    <span className="study-assistant__hint-step-label">
                      Hint {Math.min(hintStep, effectiveHintCount)} of {effectiveHintCount}
                    </span>
                  </div>
                )}

                {(!isHintTab || !solutionRevealed) && (
                  <div className="study-assistant__text study-assistant__text--reveal">
                    <AiStreamingMarkdown
                      key={streamKey}
                      text={streamText}
                      onComplete={() => setStreamComplete(true)}
                    />
                  </div>
                )}

                {canShowNextHint && (
                  <button type="button" className="study-assistant__next-hint" onClick={revealNextHint}>
                    <span className="material-symbols-outlined">lightbulb</span>
                    {nextHintButtonLabel(hintStep)}
                  </button>
                )}

                {canShowFullSolution && (
                  <button
                    type="button"
                    className="study-assistant__show-solution"
                    disabled={solutionBusy}
                    onClick={revealFullSolution}
                  >
                    <span className="material-symbols-outlined">menu_book</span>
                    {solutionBusy ? "Loading solution…" : "Show full solution"}
                  </button>
                )}

                {isHintTab && allHintsShown && !hasSolution && !solutionRevealed && (
                  <p className="study-assistant__hint-done">All hints shown — try solving, then submit.</p>
                )}

                {solutionError && <p className="study-assistant__error">{solutionError}</p>}

                {isHintTab && solutionRevealed && solutionImageUrl && (
                  <div className="study-assistant__solution">
                    <div className="study-assistant__solution-head">
                      <span className="study-assistant__hint-step-label study-assistant__hint-step-label--solution">
                        Full solution
                      </span>
                      <div className="study-assistant__solution-actions">
                        <button
                          type="button"
                          className="study-assistant__solution-action"
                          onClick={() => setSolutionExpanded(true)}
                        >
                          <span className="material-symbols-outlined">fullscreen</span>
                          Enlarge
                        </button>
                        <a
                          href={imageSrc(solutionImageUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="study-assistant__solution-action"
                        >
                          <span className="material-symbols-outlined">open_in_new</span>
                          Open
                        </a>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="study-assistant__solution-viewport"
                      onClick={() => setSolutionExpanded(true)}
                      aria-label="Enlarge official solution"
                    >
                      <div className="exam-paper-image-frame study-assistant__solution-frame">
                        <img
                          className="exam-paper-image study-assistant__solution-image"
                          src={imageSrc(solutionImageUrl)}
                          alt="Official solution"
                        />
                      </div>
                    </button>
                    <p className="study-assistant__hint-done">
                      Official published solution — tap image to enlarge, or scroll inside the panel.
                    </p>
                  </div>
                )}

                {!isHintTab && streamComplete && activeResult.similarQuestions.length > 0 && (
                  <ul className="study-assistant__similar">
                    {activeResult.similarQuestions.map((s) => (
                      <li key={s.questionId}>
                        <Link to={`/solve/${s.questionId}`}>
                          Q{s.questionNo} · {s.chapter || s.subject}
                          {s.questionTextPreview ? ` — ${s.questionTextPreview.slice(0, 72)}…` : ""}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {!isHintTab && streamComplete && activeResult.actionUrl && (
                  <Link to={activeResult.actionUrl} className="study-assistant__cta">
                    Open in bank →
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {solutionExpanded && solutionImageUrl && (
        <div
          className="study-assistant-solution-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Official solution enlarged"
          onClick={() => setSolutionExpanded(false)}
        >
          <div
            className="study-assistant-solution-modal__inner"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="study-assistant-solution-modal__close"
              onClick={() => setSolutionExpanded(false)}
              aria-label="Close enlarged solution"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="study-assistant-solution-modal__frame">
              <img
                className="study-assistant-solution-modal__image"
                src={imageSrc(solutionImageUrl)}
                alt="Official solution enlarged"
              />
            </div>
          </div>
        </div>
      )}

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
