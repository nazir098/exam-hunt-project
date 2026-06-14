import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  adminSearchQuestions,
  fetchAdminAiPrompt,
  fetchAdminAiPromptFeatures,
  fetchAdminQuestion,
  practiceAiAssist,
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
import AdminLatexField from "../components/AdminLatexField";
import AiMarkdown from "../components/AiMarkdown";
import AppLoader from "../components/AppLoader";
import QuestionVariantSwitcher from "../components/QuestionVariantSwitcher";
import TextMcqQuestion from "../components/TextMcqQuestion";
import { PRACTICE_AI_FEATURES } from "../utils/practiceAiFeatures";

const OPTION_IDS = ["1", "2", "3", "4"];

function usesTextVariantLayout(q: AdminQuestionDetail) {
  if (q.options && q.options.length > 0) return true;
  if (q.questionDiagramSvg?.trim()) return true;
  if (q.assertion?.trim() || q.reason?.trim()) return true;
  if (q.statements && q.statements.length > 0) return true;
  if (q.sourceType === "ai_variant" && q.questionTextPreview?.trim()) return true;
  return false;
}

function isImageQuestion(q: AdminQuestionDetail) {
  return Boolean(q.questionImageUrl?.trim()) && !usesTextVariantLayout(q);
}

function emptyOptions(): McqOptionView[] {
  return OPTION_IDS.map((id) => ({ id, text: "" }));
}

function normalizeOptions(options: McqOptionView[] | undefined): McqOptionView[] {
  const byId = new Map((options ?? []).map((o) => [o.id, o.text]));
  return OPTION_IDS.map((id) => ({ id, text: byId.get(id) ?? "" }));
}

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

export default function AdminQuestionEditorPage() {
  const { questionId: routeQuestionId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [searchQ, setSearchQ] = useState(searchParams.get("q") ?? "Q1");
  const [packFilter, setPackFilter] = useState(searchParams.get("packId") ?? "");
  const [searchResults, setSearchResults] = useState<AdminQuestionSearchRow[]>([]);
  const [searching, setSearching] = useState(false);

  const [q, setQ] = useState<AdminQuestionDetail | null>(null);
  const [contentDraft, setContentDraft] = useState<ContentDraft | null>(null);
  const [enrichmentDraft, setEnrichmentDraft] = useState<EnrichmentDraft | null>(null);
  const [showSolution, setShowSolution] = useState(true);
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

  async function saveContent() {
    if (!questionId || !contentDraft) return;
    setBusy("content");
    setSavedMsg("");
    setError("");
    try {
      const updated = await updateAdminQuestionContent(questionId, contentDraft);
      setQ(updated);
      setContentDraft(draftFromQuestion(updated));
      setSavedMsg("Question content saved.");
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
      setSavedMsg("AI enrichment overrides saved for future student hits.");
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
      setSavedMsg(`Cleared cached ${feature} data.`);
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
        setSavedMsg(`${feature} returned cached/pre-imported content (not a new LLM call).`);
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
            <h1 className="text-headline text-on-surface">Question editor</h1>
            <p className="text-body-sm text-on-surface-variant mt-2">
              Preview how students see a question, fix text/options, and override AI assistant responses.
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
              placeholder="Search by question id, Q number, subject…"
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
            />
            <input
              className="admin-page__input"
              value={packFilter}
              onChange={(e) => setPackFilter(e.target.value)}
              placeholder="Pack id filter (optional)"
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
    <main className="stitch-page admin-page admin-question-page">
      <header className="admin-page__hero">
        <div>
          <p className="text-caption text-on-surface-variant uppercase tracking-wide">Administrator</p>
          <h1 className="text-headline text-on-surface">Question editor</h1>
          <p className="text-body-sm text-on-surface-variant mt-2">
            {q.exam} {q.year} · Q{q.questionNo} · {q.subject} · {q.chapter}
          </p>
          <p className="text-caption muted">{q.questionId}</p>
        </div>
        <div className="admin-question-page__actions">
          <Link to="/admin/questions" className="btn">
            Search
          </Link>
          <Link to={`/solve/${encodeURIComponent(questionId)}`} className="btn" target="_blank" rel="noreferrer">
            Open solve page
          </Link>
          <Link to="/admin" className="btn">
            Admin home
          </Link>
        </div>
      </header>

      <QuestionVariantSwitcher
        questionId={questionId}
        onSelect={(qid) => navigate(`/admin/questions/${encodeURIComponent(qid)}`)}
      />

      {(error || savedMsg) && (
        <p className={error ? "admin-page__folder-hint admin-page__folder-hint--error" : "admin-question-saved"}>
          {error || savedMsg}
        </p>
      )}
      {q.adminLockedFields?.length > 0 && (
        <p className="admin-question-locked-hint muted">
          Admin-protected fields ({q.adminLockedFields.length}) — re-sync and AI cache will not overwrite these.
        </p>
      )}

      <div className="admin-question-layout">
        <section className="admin-question-preview glass-card">
          <div className="admin-question-preview__head">
            <h2 className="admin-page__section-title">Student preview</h2>
            <label className="admin-question-preview__toggle">
              <input
                type="checkbox"
                checked={showSolution}
                onChange={(e) => setShowSolution(e.target.checked)}
              />
              Show solution
            </label>
          </div>
          <div className="admin-question-preview__body">
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
                questionImageUrl={previewQ.questionImageUrl}
                questionDiagramSvg={previewQ.questionDiagramSvg}
                correctAnswer={previewQ.answer}
                showCorrect={showSolution}
              />
            )}
            {showSolution && (
              <div className="admin-question-preview__solution">
                <p className="admin-question-preview__solution-label">
                  Correct answer: <strong>{previewQ.answer}</strong>
                </p>
                {previewQ.solutionImageUrl?.trim() ? (
                  <img src={previewQ.solutionImageUrl} alt="Solution" />
                ) : previewQ.solutionDiagramSvg?.trim() ? (
                  <div
                    className="variant-diagram__svg"
                    dangerouslySetInnerHTML={{ __html: previewQ.solutionDiagramSvg }}
                  />
                ) : previewQ.solutionTextPreview?.trim() ? (
                  <AiMarkdown text={previewQ.solutionTextPreview} className="ai-markdown--paper" />
                ) : (
                  <p className="muted">No solution content.</p>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="admin-question-edit glass-card">
          <h2 className="admin-page__section-title">Edit content</h2>
          <div className="admin-edit-paper">
            <AdminLatexField
              label="Question text"
              rows={5}
              value={contentDraft.questionTextPreview}
              onChange={(questionTextPreview) =>
                setContentDraft((d) => d && { ...d, questionTextPreview })
              }
            />
            <label className="admin-latex-field admin-latex-field--inline">
              <span className="admin-latex-field__label">Question format</span>
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
              label="Assertion (A)"
              rows={2}
              value={contentDraft.assertion}
              onChange={(assertion) => setContentDraft((d) => d && { ...d, assertion })}
            />
            <AdminLatexField
              label="Reason (R)"
              rows={2}
              value={contentDraft.reason}
              onChange={(reason) => setContentDraft((d) => d && { ...d, reason })}
            />
            <div className="admin-latex-field">
              <span className="admin-latex-field__label">Options</span>
              {contentDraft.options.map((opt) => (
                <AdminLatexField
                  key={opt.id}
                  label={`Option ${opt.id}`}
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
              label="Solution text"
              rows={4}
              value={contentDraft.solutionTextPreview}
              onChange={(solutionTextPreview) =>
                setContentDraft((d) => d && { ...d, solutionTextPreview })
              }
            />
            <button
              type="button"
              className="btn primary"
              disabled={busy === "content"}
              onClick={saveContent}
            >
              {busy === "content" ? "Saving…" : "Save question content"}
            </button>
          </div>
        </section>
      </div>

      <section className="admin-question-ai glass-card">
        <h2 className="admin-page__section-title">AI assistant review</h2>
        <p className="admin-page__section-desc muted">
          Run each feature as a student would, inspect the response, then edit cached fields below so
          future hits use your override. Use <strong>View prompt</strong> to copy the exact system +
          user prompt into ChatGPT.
        </p>
        <div className="admin-question-ai__controls">
          <label className="admin-field admin-field--inline">
            <span>Simulated wrong answer (why_wrong / basics)</span>
            <select
              className="admin-page__input admin-page__input--narrow"
              value={aiSelectedAnswer}
              onChange={(e) => setAiSelectedAnswer(e.target.value)}
            >
              {OPTION_IDS.map((id) => (
                <option key={id} value={id}>
                  {id}
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
                      View prompt
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm primary"
                      disabled={busy === `ai-${feat.id}`}
                      onClick={() => runAiFeature(feat.id)}
                    >
                      Run AI
                    </button>
                    {meta?.questionScoped && (
                      <button
                        type="button"
                        className="btn btn-sm danger"
                        disabled={busy === `clear-${feat.id}`}
                        onClick={() => clearFeatureCache(feat.id)}
                      >
                        Clear cache
                      </button>
                    )}
                  </div>
                </div>
                <p className="muted admin-ai-feature-card__desc">{feat.description}</p>
                {response && (
                  <div className="admin-ai-feature-card__response admin-edit-paper admin-edit-paper--inset">
                    <AiMarkdown text={response} className="ai-markdown--paper" />
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <h3 className="admin-page__section-title">Override cached enrichment</h3>
        <div className="admin-edit-paper">
          <div className="admin-enrichment-grid">
            <div className="admin-latex-field">
              <span className="admin-latex-field__label">Hints (3 lines — used by Hint feature)</span>
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
              label="Revision notes"
              rows={5}
              value={enrichmentDraft.revisionNotes}
              onChange={(revisionNotes) =>
                setEnrichmentDraft((d) => d && { ...d, revisionNotes })
              }
            />
            <AdminLatexField
              label="Concept explanation (Basics)"
              rows={4}
              value={enrichmentDraft.conceptExplanation}
              onChange={(conceptExplanation) =>
                setEnrichmentDraft((d) => d && { ...d, conceptExplanation })
              }
            />
            <AdminLatexField
              label="Practice pattern (Pitfalls)"
              rows={3}
              value={enrichmentDraft.practicePattern}
              onChange={(practicePattern) =>
                setEnrichmentDraft((d) => d && { ...d, practicePattern })
              }
            />
            <div className="admin-latex-field">
              <span className="admin-latex-field__label">Why wrong (per option)</span>
              {OPTION_IDS.map((id) => (
                <AdminLatexField
                  key={id}
                  label={`Option ${id}`}
                  rows={2}
                  compact
                  value={enrichmentDraft.whyWrongByAnswer[id] ?? ""}
                  onChange={(value) =>
                    setEnrichmentDraft((d) =>
                      d
                        ? {
                            ...d,
                            whyWrongByAnswer: { ...d.whyWrongByAnswer, [id]: value },
                          }
                        : d
                    )
                  }
                />
              ))}
            </div>
            <div className="admin-latex-field admin-latex-field--wide">
              <span className="admin-latex-field__label">Formula cards</span>
              {enrichmentDraft.formulaCards.map((card, idx) => (
                <div key={idx} className="admin-formula-card-edit">
                  <label className="admin-latex-field admin-latex-field--inline">
                    <span className="admin-latex-field__label">Name</span>
                    <input
                      className="admin-latex-field__input"
                      placeholder="Formula name"
                      value={card.name}
                      onChange={(e) =>
                        setEnrichmentDraft((d) => {
                          if (!d) return d;
                          const formulaCards = [...d.formulaCards];
                          formulaCards[idx] = { ...formulaCards[idx], name: e.target.value };
                          return { ...d, formulaCards };
                        })
                      }
                    />
                  </label>
                  <AdminLatexField
                    label="LaTeX equation"
                    rows={2}
                    previewMode="formula"
                    value={card.formula}
                    onChange={(formula) =>
                      setEnrichmentDraft((d) => {
                        if (!d) return d;
                        const formulaCards = [...d.formulaCards];
                        formulaCards[idx] = { ...formulaCards[idx], formula };
                        return { ...d, formulaCards };
                      })
                    }
                  />
                  <AdminLatexField
                    label="When to use"
                    rows={2}
                    compact
                    value={card.description}
                    onChange={(description) =>
                      setEnrichmentDraft((d) => {
                        if (!d) return d;
                        const formulaCards = [...d.formulaCards];
                        formulaCards[idx] = { ...formulaCards[idx], description };
                        return { ...d, formulaCards };
                      })
                    }
                  />
                </div>
              ))}
            </div>
            <AdminLatexField
              label="Common mistakes (one per line in storage)"
              rows={4}
              value={enrichmentDraft.commonMistakes.join("\n")}
              onChange={(raw) =>
                setEnrichmentDraft((d) =>
                  d ? { ...d, commonMistakes: raw.split("\n") } : d
                )
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

      {activePrompt && (
        <div className="admin-prompt-modal" role="dialog" aria-modal="true">
          <div className="admin-prompt-modal__panel glass-card">
            <div className="admin-prompt-modal__head">
              <h2>Prompt — {activePrompt.label}</h2>
              <button type="button" className="btn" onClick={() => setActivePrompt(null)}>
                Close
              </button>
            </div>
            {activePrompt.notes && <p className="muted admin-prompt-modal__notes">{activePrompt.notes}</p>}
            <label className="admin-field">
              <span>System prompt</span>
              <textarea className="admin-page__textarea" rows={8} readOnly value={activePrompt.systemPrompt} />
            </label>
            <label className="admin-field">
              <span>User prompt (resolved for this question)</span>
              <textarea className="admin-page__textarea" rows={12} readOnly value={activePrompt.userPrompt} />
            </label>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                const blob = `SYSTEM:\n${activePrompt.systemPrompt}\n\nUSER:\n${activePrompt.userPrompt}`;
                void navigator.clipboard.writeText(blob);
                setSavedMsg("Prompt copied to clipboard.");
              }}
            >
              Copy full prompt
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
