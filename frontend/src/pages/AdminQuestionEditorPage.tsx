import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  adminSearchQuestions,
  fetchAdminAiPrompt,
  fetchAdminAiPromptFeatures,
  fetchAdminQuestion,
  practiceAiAssist,
  resetAdminQuestionFromMetadata,
  updateAdminQuestionContent,
  updateAdminQuestionEnrichment,
  type AdminAiPromptFeature,
  type AdminAiPromptView,
  type AdminQuestionDetail,
  type AdminQuestionSearchRow,
  type McqOptionView,
  type PracticeAiFeature,
} from "../api";
import { useAuth } from "../auth/AuthContext";
import AdminQuestionContentPanel from "../components/AdminQuestionContentPanel";
import AdminLatexField from "../components/AdminLatexField";
import AiMarkdown from "../components/AiMarkdown";
import AppLoader from "../components/AppLoader";
import QuestionVariantSwitcher from "../components/QuestionVariantSwitcher";
import TextMcqQuestion from "../components/TextMcqQuestion";
import { PRACTICE_AI_FEATURES } from "../utils/practiceAiFeatures";
import { hybridDiagramUrl, isImageQuestion, textMcqDisplayProps } from "../utils/questionRender";

const OPTION_IDS = ["1", "2", "3", "4"];

type EditorTab = "fix" | "override" | "ai";

type ContentDraft = {
  questionTextPreview: string;
  solutionTextPreview: string;
  answer: string;
  options: McqOptionView[];
  questionFormat: string;
  assertion: string;
  reason: string;
  statements: McqOptionView[];
  questionDiagramSvg: string;
  solutionDiagramSvg: string;
};

type EnrichmentDraft = {
  hints: string[];
  revisionNotes: string;
  conceptExplanation: string;
  commonMistakes: string[];
  practicePattern: string;
  whyWrongByAnswer: Record<string, string>;
  formulaCards: { name: string; formula: string; description: string }[];
};

function emptyOptions(): McqOptionView[] {
  return OPTION_IDS.map((id) => ({ id, text: "" }));
}

function normalizeOptions(options: McqOptionView[] | undefined): McqOptionView[] {
  const byId = new Map((options ?? []).map((o) => [o.id, o.text]));
  return OPTION_IDS.map((id) => ({ id, text: byId.get(id) ?? "" }));
}

function draftFromQuestion(q: AdminQuestionDetail): ContentDraft {
  return {
    questionTextPreview: q.questionTextPreview ?? "",
    solutionTextPreview: q.solutionTextPreview ?? "",
    answer: q.answer ?? "1",
    options: normalizeOptions(q.options),
    questionFormat: q.questionFormat ?? "",
    assertion: q.assertion ?? "",
    reason: q.reason ?? "",
    statements: q.statements?.length ? normalizeOptions(q.statements) : emptyOptions().slice(0, 3),
    questionDiagramSvg: q.questionDiagramSvg ?? "",
    solutionDiagramSvg: q.solutionDiagramSvg ?? "",
  };
}

function enrichmentFromQuestion(q: AdminQuestionDetail): EnrichmentDraft {
  return {
    hints: [...(q.hints ?? []), "", "", ""].slice(0, 3),
    revisionNotes: q.revisionNotes ?? "",
    conceptExplanation: q.conceptExplanation ?? "",
    commonMistakes: q.commonMistakes?.length ? [...q.commonMistakes] : [""],
    practicePattern: q.practicePattern ?? "",
    whyWrongByAnswer: { ...OPTION_IDS.reduce((acc, id) => ({ ...acc, [id]: "" }), {}), ...q.whyWrongByAnswer },
    formulaCards: q.formulaCards?.length
      ? q.formulaCards.map((c) => ({ ...c }))
      : [{ name: "", formula: "", description: "" }],
  };
}

function previewQuestion(draft: ContentDraft, base: AdminQuestionDetail): AdminQuestionDetail {
  return {
    ...base,
    questionTextPreview: draft.questionTextPreview,
    solutionTextPreview: draft.solutionTextPreview,
    answer: draft.answer,
    options: draft.options.filter((o) => o.text.trim()),
    questionFormat: draft.questionFormat,
    assertion: draft.assertion,
    reason: draft.reason,
    statements: draft.statements.filter((o) => o.text.trim()),
    questionDiagramSvg: draft.questionDiagramSvg,
    solutionDiagramSvg: draft.solutionDiagramSvg,
  };
}

const EDITOR_TABS: { id: EditorTab; label: string; hint: string }[] = [
  {
    id: "fix",
    label: "Fix question",
    hint: "Compare PDF → edit text → save (most common)",
  },
  {
    id: "override",
    label: "Quick override",
    hint: "Edit stem & options directly in the app",
  },
  {
    id: "ai",
    label: "AI assistant",
    hint: "Hints, basics, revision notes",
  },
];

export default function AdminQuestionEditorPage() {
  const { questionId: routeQuestionId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialFixSection = searchParams.get("section") === "solution" ? "solution" : "question";
  const { user, loading: authLoading } = useAuth();

  const [searchQ, setSearchQ] = useState(searchParams.get("q") ?? "Q1");
  const [packFilter, setPackFilter] = useState(searchParams.get("packId") ?? "");
  const [searchResults, setSearchResults] = useState<AdminQuestionSearchRow[]>([]);
  const [searching, setSearching] = useState(false);

  const [q, setQ] = useState<AdminQuestionDetail | null>(null);
  const [contentDraft, setContentDraft] = useState<ContentDraft | null>(null);
  const [enrichmentDraft, setEnrichmentDraft] = useState<EnrichmentDraft | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>("fix");
  const [showSolution, setShowSolution] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState("");
  const [aiSelectedAnswer, setAiSelectedAnswer] = useState("2");
  const [promptFeatures, setPromptFeatures] = useState<AdminAiPromptFeature[]>([]);
  const [activePrompt, setActivePrompt] = useState<AdminAiPromptView | null>(null);
  const [aiResponses, setAiResponses] = useState<Partial<Record<PracticeAiFeature, string>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  const questionId = routeQuestionId ?? "";

  const loadQuestion = useCallback(async (qid: string) => {
    setError("");
    const detail = await fetchAdminQuestion(qid);
    setQ(detail);
    setContentDraft(draftFromQuestion(detail));
    setEnrichmentDraft(enrichmentFromQuestion(detail));
    setAiResponses({});
  }, []);

  useEffect(() => {
    if (!user?.admin) return;
    fetchAdminAiPromptFeatures().then(setPromptFeatures).catch(() => setPromptFeatures([]));
  }, [user?.admin]);

  useEffect(() => {
    if (!user?.admin || !questionId) return;
    loadQuestion(questionId).catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [user?.admin, questionId, loadQuestion]);

  useEffect(() => {
    if (searchParams.get("section") === "solution") {
      setActiveTab("fix");
    }
  }, [searchParams, questionId]);

  const runSearch = useCallback(async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    setError("");
    try {
      const res = await adminSearchQuestions({
        q: searchQ.trim(),
        packId: packFilter.trim() || undefined,
        size: 30,
      });
      setSearchResults(res.content);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQ, packFilter]);

  useEffect(() => {
    if (!user?.admin || questionId) return;
    runSearch();
  }, [user?.admin, questionId, runSearch]);

  const previewQ = useMemo(() => {
    if (!q || !contentDraft) return null;
    return previewQuestion(contentDraft, q);
  }, [q, contentDraft]);

  const questionFeatures = useMemo(
    () => PRACTICE_AI_FEATURES.filter((f) => !f.global),
    []
  );

  async function resetFromMetadata() {
    if (!questionId) return;
    if (!window.confirm("Replace stem and options with PDF extractor data? Your manual overrides will be cleared.")) {
      return;
    }
    setBusy("reset-metadata");
    setError("");
    setSavedMsg("");
    try {
      const updated = await resetAdminQuestionFromMetadata(questionId);
      setQ(updated);
      setContentDraft(draftFromQuestion(updated));
      setSavedMsg("Restored from PDF metadata.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setBusy(null);
    }
  }

  async function saveContent() {
    if (!questionId || !contentDraft) return;
    setBusy("content");
    setSavedMsg("");
    setError("");
    try {
      const updated = await updateAdminQuestionContent(questionId, contentDraft);
      setQ(updated);
      setContentDraft(draftFromQuestion(updated));
      setSavedMsg("Saved — students will see these changes.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function saveEnrichment() {
    if (!questionId || !enrichmentDraft) return;
    setBusy("enrichment");
    setSavedMsg("");
    setError("");
    try {
      const whyWrong: Record<string, string> = {};
      for (const id of OPTION_IDS) {
        const text = enrichmentDraft.whyWrongByAnswer[id]?.trim();
        if (text) whyWrong[id] = text;
      }
      const updated = await updateAdminQuestionEnrichment(questionId, {
        hints: enrichmentDraft.hints.map((h) => h.trim()).filter(Boolean),
        revisionNotes: enrichmentDraft.revisionNotes,
        conceptExplanation: enrichmentDraft.conceptExplanation,
        commonMistakes: enrichmentDraft.commonMistakes.map((m) => m.trim()).filter(Boolean),
        practicePattern: enrichmentDraft.practicePattern,
        whyWrongByAnswer: whyWrong,
        formulaCards: enrichmentDraft.formulaCards.filter((c) => c.name.trim()),
      });
      setQ(updated);
      setEnrichmentDraft(enrichmentFromQuestion(updated));
      setSavedMsg("AI assistant overrides saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function clearFeatureCache(feature: PracticeAiFeature) {
    if (!questionId) return;
    setBusy(`clear-${feature}`);
    setError("");
    try {
      const updated = await updateAdminQuestionEnrichment(questionId, { clearFeatures: [feature] });
      setQ(updated);
      setEnrichmentDraft(enrichmentFromQuestion(updated));
      setSavedMsg(`Cleared cached ${feature}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Clear failed");
    } finally {
      setBusy(null);
    }
  }

  async function runAiFeature(feature: PracticeAiFeature) {
    if (!questionId) return;
    setBusy(`ai-${feature}`);
    setError("");
    try {
      const res = await practiceAiAssist({
        feature,
        questionId,
        selectedAnswer: feature === "why_wrong" || feature === "explain_basics" ? aiSelectedAnswer : undefined,
      });
      const text =
        feature === "hint" && res.hintSteps?.length
          ? res.hintSteps.map((s, i) => `Hint ${i + 1}: ${s}`).join("\n\n")
          : res.text;
      setAiResponses((prev) => ({ ...prev, [feature]: text }));
      if (!res.llm) {
        setSavedMsg("Returned cached content (no new LLM call).");
      }
      await loadQuestion(questionId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI assist failed");
    } finally {
      setBusy(null);
    }
  }

  async function showPrompt(feature: PracticeAiFeature) {
    setBusy(`prompt-${feature}`);
    setError("");
    try {
      const prompt = await fetchAdminAiPrompt({
        feature,
        questionId: questionId || undefined,
        selectedAnswer:
          feature === "why_wrong" || feature === "explain_basics" ? aiSelectedAnswer : undefined,
      });
      setActivePrompt(prompt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load prompt");
    } finally {
      setBusy(null);
    }
  }

  if (authLoading) {
    return (
      <main className="stitch-page admin-page">
        <p className="muted">Loading…</p>
      </main>
    );
  }

  if (!user?.admin) {
    return <Navigate to="/login" replace />;
  }

  if (!questionId) {
    return (
      <main className="stitch-page admin-page admin-question-page">
        <header className="admin-page__hero">
          <div>
            <p className="text-caption text-on-surface-variant uppercase tracking-wide">Administrator</p>
            <h1 className="text-headline text-on-surface">Find a question</h1>
            <p className="text-body-sm text-on-surface-variant mt-2">
              Search by question number, id, or subject — then open it to fix formatting.
            </p>
          </div>
          <Link to="/admin" className="btn">
            Back to admin
          </Link>
        </header>

        <section className="admin-question-search glass-card">
          <div className="admin-question-search__row">
            <input
              className="admin-page__input"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="e.g. Q1, NEET_2025_Q1, Physics"
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
            />
            <input
              className="admin-page__input"
              value={packFilter}
              onChange={(e) => setPackFilter(e.target.value)}
              placeholder="Pack (optional)"
            />
            <button type="button" className="btn primary" disabled={searching} onClick={runSearch}>
              {searching ? "Searching…" : "Search"}
            </button>
          </div>
          {error && <p className="admin-page__folder-hint admin-page__folder-hint--error">{error}</p>}
          <ul className="admin-question-search__results">
            {searchResults.map((row) => (
              <li key={row.questionId}>
                <button
                  type="button"
                  className="admin-question-search__item"
                  onClick={() => navigate(`/admin/questions/${encodeURIComponent(row.questionId)}`)}
                >
                  <strong>
                    {row.sourceType === "ai_variant" && row.variantNo > 0
                      ? `V${row.variantNo} · `
                      : ""}
                    Q{row.questionNo}
                  </strong>
                  <span className="muted">
                    {row.questionId} · {row.subject} · {row.chapter}
                  </span>
                  <span className="admin-question-search__preview muted">
                    {(row.questionTextPreview || "(image question)").slice(0, 120)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>
    );
  }

  if (!q || !contentDraft || !enrichmentDraft || !previewQ) {
    return (
      <main className="stitch-page admin-page">
        {error ? (
          <p className="muted">{error}</p>
        ) : (
          <section className="glass-card content-loader-panel">
            <AppLoader
              variant="inline"
              label="Loading question…"
              hint="Fetching editor data"
              icon="menu_book"
            />
          </section>
        )}
      </main>
    );
  }

  return (
    <main className="stitch-page admin-page admin-question-page admin-question-page--focused">
      <header className="admin-question-focus__header">
        <Link to="/admin/questions" className="admin-question-focus__back muted">
          ← All questions
        </Link>
        <div className="admin-question-focus__title-row">
          <div>
            <h1 className="admin-question-focus__title">
              {q.exam} {q.year} · Question {q.questionNo}
            </h1>
            <p className="admin-question-focus__meta muted">
              {q.subject} · {q.chapter}
              {q.topic ? ` · ${q.topic}` : ""}
            </p>
          </div>
          <Link
            to={`/solve/${encodeURIComponent(questionId)}`}
            className="btn primary"
            target="_blank"
            rel="noreferrer"
          >
            View as student ↗
          </Link>
        </div>
        <QuestionVariantSwitcher
          questionId={questionId}
          onSelect={(qid) => navigate(`/admin/questions/${encodeURIComponent(qid)}`)}
        />
      </header>

      {(error || savedMsg) && (
        <p className={error ? "admin-page__folder-hint admin-page__folder-hint--error" : "admin-question-saved"}>
          {error || savedMsg}
        </p>
      )}

      <section className="admin-question-workflow glass-card" aria-label="How to fix a question">
        <h2 className="admin-question-workflow__title">How to fix broken formatting</h2>
        <ol className="admin-question-workflow__steps">
          <li>
            <strong>Check the preview</strong> — does the question look wrong compared to the PDF?
          </li>
          <li>
            <strong>Edit the text</strong> — fix LaTeX/OCR in the box, or click <em>Fix LaTeX (LLM)</em>
          </li>
          <li>
            <strong>Save</strong> — click <em>Save raw text</em> (or <em>Save solution</em> on the Solution tab)
          </li>
        </ol>
      </section>

      <nav className="admin-question-tabs" aria-label="Editor sections">
        {EDITOR_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`admin-question-tabs__btn${activeTab === tab.id ? " admin-question-tabs__btn--active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="admin-question-tabs__label">{tab.label}</span>
            <span className="admin-question-tabs__hint">{tab.hint}</span>
          </button>
        ))}
      </nav>

      {activeTab === "fix" && (
        <AdminQuestionContentPanel
          questionId={questionId}
          initialSection={initialFixSection}
          onMongoRefresh={() => loadQuestion(questionId)}
        />
      )}

      {activeTab === "override" && (
        <div className="admin-question-tab-panel">
          <section className="glass-card admin-question-preview admin-question-preview--compact">
            <div className="admin-question-preview__head">
              <h2 className="admin-page__section-title">Live preview</h2>
              <label className="admin-question-preview__toggle">
                <input
                  type="checkbox"
                  checked={showSolution}
                  onChange={(e) => setShowSolution(e.target.checked)}
                />
                Show answer
              </label>
            </div>
            <div className="admin-question-preview__body admin-question-preview__body--dark">
              {isImageQuestion(previewQ) ? (
                <img
                  className="admin-question-preview__img"
                  src={previewQ.questionImageUrl}
                  alt={`Question ${previewQ.questionNo}`}
                />
              ) : (
                <TextMcqQuestion
                  questionText={previewQ.questionTextPreview || "No question text"}
                  options={previewQ.options ?? []}
                  selected={selectedPreview}
                  onSelect={setSelectedPreview}
                  questionFormat={previewQ.questionFormat}
                  variantType={previewQ.variantType}
                  assertion={previewQ.assertion}
                  reason={previewQ.reason}
                  statements={previewQ.statements}
                  matchListA={previewQ.matchListA}
                  matchListB={previewQ.matchListB}
                  questionId={previewQ.questionId}
                  questionImageUrl={hybridDiagramUrl(previewQ)}
                  questionDiagramSvg={previewQ.questionDiagramSvg}
                  assetPlacements={previewQ.assetPlacements}
                  {...textMcqDisplayProps(previewQ)}
                  correctAnswer={previewQ.answer}
                  showCorrect={showSolution}
                />
              )}
              {showSolution && (
                <div className="admin-question-preview__solution">
                  <p className="admin-question-preview__solution-label">
                    Answer: <strong>{previewQ.answer}</strong>
                  </p>
                  {previewQ.solutionTextPreview?.trim() ? (
                    <AiMarkdown text={previewQ.solutionTextPreview} className="ai-markdown--paper" />
                  ) : (
                    <p className="muted">No solution text.</p>
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="glass-card admin-question-edit">
            <h2 className="admin-page__section-title">Edit fields directly</h2>
            <p className="admin-page__section-desc muted">
              Use this only when you need a quick tweak without re-parsing from the PDF extractor.
              For OCR/LaTeX fixes, prefer the{" "}
              <button type="button" className="admin-inline-link" onClick={() => setActiveTab("fix")}>
                Fix question
              </button>{" "}
              tab.
            </p>
            {q.adminLockedFields?.length > 0 && (
              <p className="admin-content-qc__lead muted admin-content-qc__lead--warn">
                Manual overrides are locked ({q.adminLockedFields.length} fields) — re-import will not
                change them until you restore from PDF data.
              </p>
            )}
            <div className="admin-question-edit__toolbar">
              <button
                type="button"
                className="btn btn-sm"
                disabled={busy === "reset-metadata"}
                onClick={resetFromMetadata}
              >
                {busy === "reset-metadata" ? "Restoring…" : "Restore from PDF data"}
              </button>
            </div>
            <div className="admin-edit-paper">
              <AdminLatexField
                label="Question text"
                rows={5}
                value={contentDraft.questionTextPreview}
                onChange={(questionTextPreview) =>
                  setContentDraft((d) => d && { ...d, questionTextPreview })
                }
              />
              <div className="admin-latex-field">
                <span className="admin-latex-field__label">Options</span>
                {contentDraft.options.map((opt) => (
                  <AdminLatexField
                    key={opt.id}
                    label={`(${opt.id})`}
                    rows={2}
                    compact
                    value={opt.text}
                    onChange={(text) =>
                      setContentDraft((d) =>
                        d
                          ? {
                              ...d,
                              options: d.options.map((o) => (o.id === opt.id ? { ...o, text } : o)),
                            }
                          : d
                      )
                    }
                  />
                ))}
              </div>
              <label className="admin-latex-field admin-latex-field--inline">
                <span className="admin-latex-field__label">Correct answer</span>
                <select
                  className="admin-latex-field__input admin-latex-field__input--select admin-latex-field__input--narrow"
                  value={contentDraft.answer}
                  onChange={(e) => setContentDraft((d) => d && { ...d, answer: e.target.value })}
                >
                  {OPTION_IDS.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </label>
              <AdminLatexField
                label="Solution (optional)"
                rows={4}
                value={contentDraft.solutionTextPreview}
                onChange={(solutionTextPreview) =>
                  setContentDraft((d) => d && { ...d, solutionTextPreview })
                }
              />
              <details className="admin-question-advanced-fields">
                <summary>Assertion / reason / format</summary>
                <label className="admin-latex-field admin-latex-field--inline">
                  <span className="admin-latex-field__label">Format</span>
                  <select
                    className="admin-latex-field__input admin-latex-field__input--select"
                    value={contentDraft.questionFormat}
                    onChange={(e) =>
                      setContentDraft((d) => d && { ...d, questionFormat: e.target.value })
                    }
                  >
                    <option value="">mcq</option>
                    <option value="assertion_reason">assertion_reason</option>
                    <option value="statement_based">statement_based</option>
                  </select>
                </label>
                <AdminLatexField
                  label="Assertion"
                  rows={2}
                  value={contentDraft.assertion}
                  onChange={(assertion) => setContentDraft((d) => d && { ...d, assertion })}
                />
                <AdminLatexField
                  label="Reason"
                  rows={2}
                  value={contentDraft.reason}
                  onChange={(reason) => setContentDraft((d) => d && { ...d, reason })}
                />
              </details>
              <button
                type="button"
                className="btn primary"
                disabled={busy === "content"}
                onClick={saveContent}
              >
                {busy === "content" ? "Saving…" : "Save changes"}
              </button>
            </div>
          </section>
        </div>
      )}

      {activeTab === "ai" && (
        <section className="glass-card admin-question-ai admin-question-tab-panel">
          <h2 className="admin-page__section-title">AI study assistant</h2>
          <p className="admin-page__section-desc muted">
            Test what students see when they tap Hint, Basics, etc. Edit the fields below to override
            auto-generated text.
          </p>
          <div className="admin-question-ai__controls">
            <label className="admin-field admin-field--inline">
              <span>Wrong answer to simulate</span>
              <select
                className="admin-page__input admin-page__input--narrow"
                value={aiSelectedAnswer}
                onChange={(e) => setAiSelectedAnswer(e.target.value)}
              >
                {OPTION_IDS.map((id) => (
                  <option key={id} value={id}>
                    Option {id}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="admin-question-ai__features">
            {questionFeatures.map((feat) => {
              const meta = promptFeatures.find((p) => p.id === feat.id);
              const response = aiResponses[feat.id];
              return (
                <article key={feat.id} className="admin-ai-feature-card">
                  <div className="admin-ai-feature-card__head">
                    <h3>{feat.label}</h3>
                    <div className="admin-ai-feature-card__actions">
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={busy === `prompt-${feat.id}`}
                        onClick={() => showPrompt(feat.id)}
                      >
                        Prompt
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm primary"
                        disabled={busy === `ai-${feat.id}`}
                        onClick={() => runAiFeature(feat.id)}
                      >
                        Run
                      </button>
                      {meta?.questionScoped && (
                        <button
                          type="button"
                          className="btn btn-sm danger"
                          disabled={busy === `clear-${feat.id}`}
                          onClick={() => clearFeatureCache(feat.id)}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  {response && (
                    <div className="admin-ai-feature-card__response admin-edit-paper admin-edit-paper--inset">
                      <AiMarkdown text={response} className="ai-markdown--paper" />
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <h3 className="admin-page__section-title">Override text</h3>
          <div className="admin-edit-paper">
            <div className="admin-enrichment-grid">
              <div className="admin-latex-field">
                <span className="admin-latex-field__label">Hints (3 lines)</span>
                {enrichmentDraft.hints.map((hint, idx) => (
                  <AdminLatexField
                    key={idx}
                    label={`Hint ${idx + 1}`}
                    rows={2}
                    compact
                    value={hint}
                    onChange={(value) =>
                      setEnrichmentDraft((d) => {
                        if (!d) return d;
                        const hints = [...d.hints];
                        hints[idx] = value;
                        return { ...d, hints };
                      })
                    }
                  />
                ))}
              </div>
              <AdminLatexField
                label="Concept explanation"
                rows={3}
                value={enrichmentDraft.conceptExplanation}
                onChange={(conceptExplanation) =>
                  setEnrichmentDraft((d) => d && { ...d, conceptExplanation })
                }
              />
            </div>
            <button
              type="button"
              className="btn primary"
              disabled={busy === "enrichment"}
              onClick={saveEnrichment}
            >
              {busy === "enrichment" ? "Saving…" : "Save AI overrides"}
            </button>
          </div>
        </section>
      )}

      {activePrompt && (
        <div className="admin-prompt-modal" role="dialog" aria-modal="true">
          <div className="admin-prompt-modal__panel glass-card">
            <div className="admin-prompt-modal__head">
              <h2>Prompt — {activePrompt.label}</h2>
              <button type="button" className="btn" onClick={() => setActivePrompt(null)}>
                Close
              </button>
            </div>
            <label className="admin-field">
              <span>System prompt</span>
              <textarea className="admin-page__textarea" rows={8} readOnly value={activePrompt.systemPrompt} />
            </label>
            <label className="admin-field">
              <span>User prompt</span>
              <textarea className="admin-page__textarea" rows={12} readOnly value={activePrompt.userPrompt} />
            </label>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                const blob = `SYSTEM:\n${activePrompt.systemPrompt}\n\nUSER:\n${activePrompt.userPrompt}`;
                void navigator.clipboard.writeText(blob);
                setSavedMsg("Prompt copied.");
              }}
            >
              Copy prompt
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
