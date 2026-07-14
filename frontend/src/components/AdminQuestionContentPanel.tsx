import { useCallback, useEffect, useState } from "react";
import {
  addAdminContentAssetFromSource,
  cropAdminContentAssetFromSource,
  fetchAdminQuestionContentFormat,
  fixAdminQuestionRawTextLatex,
  resetAdminQuestionFromMetadata,
  saveAdminQuestionRawText,
  type AdminContentFormatView,
} from "../api";
import AiMarkdown from "./AiMarkdown";
import InlineAssetMarkdown from "./InlineAssetMarkdown";
import TextMcqQuestion from "./TextMcqQuestion";
import SourceImageCropDialog, { type NormBbox } from "./SourceImageCropDialog";
import AdminAuthImage from "./AdminAuthImage";
import { hybridDiagramUrl, textMcqDisplayProps } from "../utils/questionRender";
import { displayPyqSolution } from "../utils/pyqTextDisplay";
import { normalizeSolutionText } from "../utils/questionStemNormalize";
import { resolveMatchingColumns } from "../utils/matchingVariant";
import { parseLetterStatementsStem } from "../utils/letterStatementsStem";
import type { AssetPlacementView, McqOptionView } from "../api";

type RawTarget = "question" | "solution";

type CropSession = {
  target: RawTarget;
  mode: "add" | "recrop";
  index?: number;
  initialBbox?: number[] | null;
};

type RawEditorState = {
  saved: string;
  draft: string;
  dirty: boolean;
  baseline: string;
};

function emptyRawState(): RawEditorState {
  return { saved: "", draft: "", dirty: false, baseline: "" };
}

function metaLine(cf: AdminContentFormatView) {
  const parts: string[] = [];
  if (cf.answer) parts.push(`Answer: ${cf.answer}`);
  if (cf.hasEquation) parts.push("Has equation");
  if (cf.questionFormat) parts.push(cf.questionFormat);
  if (cf.renderMode) parts.push(cf.renderMode);
  return parts.join(" · ");
}

function previewPlacements(cf: AdminContentFormatView): AssetPlacementView[] {
  return cf.questionAssetPlacements.map((p) => ({
    index: p.index,
    marker: p.marker,
    path: p.path,
    url: p.url,
  }));
}

function studentPlacements(cf: AdminContentFormatView): AssetPlacementView[] {
  const rows = cf.mongoAssetPlacements?.length ? cf.mongoAssetPlacements : cf.questionAssetPlacements;
  return rows.map((p) => ({
    index: p.index,
    marker: p.marker,
    path: p.path,
    url: p.url,
  }));
}

function previewSolutionPlacements(cf: AdminContentFormatView): AssetPlacementView[] {
  const rows = cf.solutionAssetPlacements?.length ? cf.solutionAssetPlacements : cf.questionAssetPlacements;
  return rows.map((p) => ({
    index: p.index,
    marker: p.marker,
    path: p.path,
    url: p.url,
  }));
}

function studentSolutionPlacements(cf: AdminContentFormatView): AssetPlacementView[] {
  const rows =
    cf.mongoSolutionAssetPlacements?.length
      ? cf.mongoSolutionAssetPlacements
      : cf.mongoAssetPlacements?.length
        ? cf.mongoAssetPlacements
        : previewSolutionPlacements(cf);
  return rows.map((p) => ({
    index: p.index,
    marker: p.marker,
    path: p.path,
    url: p.url,
  }));
}

type Props = {
  questionId: string;
  onMongoRefresh?: () => void | Promise<void>;
  initialSection?: "question" | "solution";
};

export default function AdminQuestionContentPanel({
  questionId,
  onMongoRefresh,
  initialSection = "question",
}: Props) {
  const [cf, setCf] = useState<AdminContentFormatView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [questionRaw, setQuestionRaw] = useState<RawEditorState>(emptyRawState());
  const [solutionRaw, setSolutionRaw] = useState<RawEditorState>(emptyRawState());
  const [fixSection, setFixSection] = useState<"question" | "solution">(initialSection);
  const [cropSession, setCropSession] = useState<CropSession | null>(null);

  useEffect(() => {
    setFixSection(initialSection);
  }, [initialSection, questionId]);

  const syncEditors = useCallback((data: AdminContentFormatView) => {
    const qText = data.questionTextMineru ?? "";
    const sText =
      data.solutionRawText?.trim() ||
      data.metadataSolutionText?.trim() ||
      data.mongoSolutionTextPreview?.trim() ||
      "";
    setQuestionRaw({ saved: qText, draft: qText, dirty: false, baseline: qText });
    setSolutionRaw({ saved: sText, draft: sText, dirty: false, baseline: sText });
  }, []);

  const load = useCallback(async () => {
    if (!questionId) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchAdminQuestionContentFormat(questionId);
      setCf(data);
      syncEditors(data);
      if (data.message) setStatus(data.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load content format");
      setCf(null);
    } finally {
      setLoading(false);
    }
  }, [questionId, syncEditors]);

  useEffect(() => {
    load();
  }, [load]);

  const studentSolutionText = cf?.mongoSolutionTextPreview?.trim() || "";
  const metadataSolutionText = cf?.metadataSolutionText?.trim() || "";
  const editorSolutionText = solutionRaw.draft.trim() || metadataSolutionText;
  const solutionPreviewText = normalizeSolutionText(editorSolutionText);
  const solutionLiveDiffers =
    Boolean(studentSolutionText) && studentSolutionText !== solutionPreviewText;

  const metadataStem = cf?.questionStem?.trim() || "";
  const studentStem = cf?.mongoQuestionTextPreview?.trim() || "";
  const metadataOptions = cf?.options ?? [];
  // Do not fall back to metadata options — that hides the real student/Mongo mismatch.
  const studentOptions = cf?.mongoOptions ?? [];
  const studentPreviewPlacements = cf ? studentPlacements(cf) : [];
  const metadataPreviewPlacements = cf ? previewPlacements(cf) : [];
  const studentPreviewProps = cf
    ? textMcqDisplayProps({
        questionId: cf.questionId,
        renderMode: cf.mongoRenderMode || cf.renderMode,
        sourceType: "pyq",
        variantType: null,
        variantNo: null,
        questionTextPreview: studentStem,
        hasDiagram: cf.hasDiagram,
      })
    : { variantTheme: false as const };
  const metadataPreviewProps = cf
    ? textMcqDisplayProps({
        questionId: cf.questionId,
        renderMode: cf.renderMode,
        sourceType: "pyq",
        variantType: null,
        variantNo: null,
        questionTextPreview: metadataStem,
        hasDiagram: cf.hasDiagram,
      })
    : { variantTheme: false as const };
  const studentHybridUrl =
    cf && studentStem
      ? hybridDiagramUrl({
          questionId: cf.questionId,
          renderMode: cf.mongoRenderMode || cf.renderMode,
          questionTextPreview: studentStem,
          hasDiagram: cf.hasDiagram,
          questionImageUrl: cf.questionImageUrl,
          assetPlacements: studentPreviewPlacements,
          options: studentOptions,
        })
      : "";
  const metadataHybridUrl =
    cf && metadataStem
      ? hybridDiagramUrl({
          questionId: cf.questionId,
          renderMode: cf.renderMode,
          questionTextPreview: metadataStem,
          hasDiagram: cf.hasDiagram,
          questionImageUrl: cf.questionImageUrl,
          assetPlacements: metadataPreviewPlacements,
          options: metadataOptions,
        })
      : "";

  async function syncStudentView() {
    if (!questionId) return;
    setBusy("sync-student");
    setError("");
    try {
      await resetAdminQuestionFromMetadata(questionId);
      const data = await fetchAdminQuestionContentFormat(questionId);
      setCf(data);
      syncEditors(data);
      if (data.studentViewStale || data.solutionViewStale) {
        setStatus(
          "Synced from metadata, but a difference remains — reload or check locked Quick override fields."
        );
      } else {
        setStatus("Student view updated from PDF metadata.");
      }
      await onMongoRefresh?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update student view");
    } finally {
      setBusy(null);
    }
  }

  async function applyCrop(bbox: NormBbox) {
    if (!questionId || !cf || !cropSession) return;
    if (!cf.metadataWritable) {
      setError("Metadata is read-only — mount EXTRACTOR_ROOT on the API server to crop.");
      return;
    }
    setBusy("crop-asset");
    setError("");
    try {
      const data =
        cropSession.mode === "add"
          ? await addAdminContentAssetFromSource(questionId, {
              target: cropSession.target,
              sourceBbox: bbox,
              insertMarker: true,
            })
          : await cropAdminContentAssetFromSource(questionId, {
              target: cropSession.target,
              index: cropSession.index ?? 0,
              sourceBbox: bbox,
            });
      setCf(data);
      syncEditors(data);
      setStatus(
        data.message ||
          "Figure saved. If R2 credentials are configured in pdf-qa-extractor/.env, production CDN is updated too."
      );
      setCropSession(null);
      // Persist CDN URLs + options into Mongo so prod (shared Atlas / next pack sync) matches.
      try {
        await resetAdminQuestionFromMetadata(questionId);
        await load();
      } catch {
        // Crop already succeeded; sync failure is reported via load/status separately.
      }
      await onMongoRefresh?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Crop failed");
    } finally {
      setBusy(null);
    }
  }

  function openAddCrop(target: RawTarget) {
    setCropSession({ target, mode: "add", initialBbox: null });
  }

  function openRecrop(target: RawTarget, index: number, bbox?: number[] | null) {
    setCropSession({ target, mode: "recrop", index, initialBbox: bbox ?? null });
  }

  function renderAssetList(target: RawTarget) {
    if (!cf) return null;
    const rows =
      target === "solution" ? cf.solutionAssetPlacements ?? [] : cf.questionAssetPlacements;
    const sourceUrl = target === "solution" ? cf.solutionImageUrl : cf.questionImageUrl;
    return (
      <div className="admin-content-qc__assets">
        <div className="admin-content-qc__assets-head">
          <p className="admin-content-qc__assets-label">Inline assets</p>
          <button
            type="button"
            className="btn btn-sm"
            disabled={!cf.metadataWritable || !sourceUrl || busy !== null}
            onClick={() => openAddCrop(target)}
          >
            Add new figure
          </button>
        </div>
        <p className="muted admin-content-qc__hint">
          To fix a broken slot (e.g. <code>asset:2</code>), click <strong>Crop from source</strong> on
          that row — it re-crops that index from the PDF image above.
        </p>
        {rows.length === 0 ? (
          <p className="muted admin-content-qc__hint">
            No figures yet. Use &quot;Add new figure&quot; to crop a region from the PDF source image.
          </p>
        ) : (
          <ul>
            {rows.map((p) => (
              <li key={`${p.marker || "asset"}-${p.index}`}>
                <div className="admin-content-qc__asset-row">
                  <code>{p.marker || `asset:${p.index}`}</code>
                  {p.hidden ? " (hidden)" : ""}
                  <button
                    type="button"
                    className="btn btn-sm primary"
                    disabled={!cf.metadataWritable || !sourceUrl || busy !== null || p.index < 0}
                    onClick={() => openRecrop(target, p.index, p.bbox)}
                  >
                    Crop from source
                  </button>
                </div>
                {p.url ? (
                  <AdminAuthImage
                    src={p.url}
                    alt={p.marker || `asset:${p.index}`}
                    className="admin-content-qc__asset-thumb"
                  />
                ) : (
                  <p className="muted admin-content-qc__asset-missing">
                    No file yet — crop from source
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  function renderMcqPreview(
    stem: string,
    options: typeof metadataOptions,
    label: string,
    placements: AssetPlacementView[],
    hybridUrl: string,
    renderProps: typeof studentPreviewProps,
    matchListA: McqOptionView[] = [],
    matchListB: McqOptionView[] = [],
    statements: McqOptionView[] = []
  ) {
    if (!cf) return null;
    const draftStem = questionRaw.draft.trim();
    const format = cf.questionFormat || "";
    // Prefer editable MinerU/raw draft when Mongo stem was stripped (matching / statement_based).
    let previewStem = stem;
    if (draftStem && draftStem !== stem) {
      if (
        format === "matching" &&
        !resolveMatchingColumns({
          questionTextPreview: stem,
          questionFormat: format,
          matchListA,
          matchListB,
          options,
        }) &&
        resolveMatchingColumns({
          questionTextPreview: draftStem,
          questionFormat: format,
          options,
        })
      ) {
        previewStem = draftStem;
      } else if (
        (format === "statement_based" || /statement/i.test(format)) &&
        statements.length < 2 &&
        parseLetterStatementsStem(draftStem)
      ) {
        previewStem = draftStem;
      }
    }
    return (
      <div className="admin-content-qc__pane">
        <div className="admin-content-qc__pane-label">{label}</div>
        <div className="admin-content-qc__pane-body">
          {previewStem ? (
            <TextMcqQuestion
              questionText={previewStem}
              options={options}
              questionFormat={cf.questionFormat}
              statements={statements}
              matchListA={matchListA}
              matchListB={matchListB}
              questionId={cf.questionId}
              questionImageUrl={hybridUrl}
              assetPlacements={placements}
              correctAnswer={cf.answer}
              {...renderProps}
            />
          ) : (
            <AiMarkdown className="admin-content-qc__markdown" preformatted text="(no structured stem yet)" />
          )}
        </div>
      </div>
    );
  }

  async function runSave(target: RawTarget) {
    if (!questionId || !cf) return;
    const row = target === "question" ? questionRaw : solutionRaw;
    if (!row.draft.trim()) {
      setError("Raw text is empty.");
      return;
    }
    if (!cf.metadataWritable) {
      setError("Metadata is read-only — mount EXTRACTOR_ROOT on the API server to save.");
      return;
    }
    setBusy(`save-${target}`);
    setError("");
    try {
      const data = await saveAdminQuestionRawText(questionId, { target, text: row.draft });
      setCf(data);
      syncEditors(data);
      setStatus(data.message || "Raw text saved.");
      await onMongoRefresh?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function runFixLatex(target: RawTarget) {
    if (!questionId || !cf) return;
    const row = target === "question" ? questionRaw : solutionRaw;
    if (!row.draft.trim()) {
      setError("Raw text is empty.");
      return;
    }
    if (!cf.metadataWritable) {
      setError("Metadata is read-only — mount EXTRACTOR_ROOT on the API server.");
      return;
    }
    setBusy(`fix-${target}`);
    setError("");
    setStatus("Repairing LaTeX with LLM…");
    try {
      const data = await fixAdminQuestionRawTextLatex(questionId, { target, text: row.draft });
      const fixedText =
        target === "question"
          ? (data.questionTextMineru ?? "")
          : (data.solutionRawText?.trim() ||
              data.metadataSolutionText?.trim() ||
              data.mongoSolutionTextPreview?.trim() ||
              "");
      setCf({
        ...data,
        ...(target === "solution"
          ? { metadataSolutionText: fixedText }
          : { questionTextMineru: fixedText }),
      });
      const applyFix = (prev: RawEditorState): RawEditorState => ({
        ...prev,
        draft: fixedText,
        dirty: fixedText !== prev.saved,
      });
      if (target === "question") {
        setQuestionRaw(applyFix);
      } else {
        setSolutionRaw(applyFix);
      }
      setStatus(
        fixedText === row.draft.trim()
          ? "LaTeX fix returned the same text — check the editor preview."
          : data.message || "LaTeX repaired in preview — click Save to persist."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fix LaTeX failed");
    } finally {
      setBusy(null);
    }
  }

  function resetRaw(target: RawTarget) {
    if (target === "question") {
      setQuestionRaw((r) => ({ ...r, draft: r.baseline, dirty: r.baseline !== r.saved }));
    } else {
      setSolutionRaw((r) => ({ ...r, draft: r.baseline, dirty: r.baseline !== r.saved }));
    }
  }

  function renderRawEditor(target: RawTarget) {
    const row = target === "question" ? questionRaw : solutionRaw;
    const setRow = target === "question" ? setQuestionRaw : setSolutionRaw;
    const saveDisabled = !row.dirty || busy !== null || !cf?.metadataWritable;
    const isSolution = target === "solution";
    return (
      <details className="admin-content-qc__raw" open>
        <summary>{isSolution ? "Edit solution text" : "Edit question text"}</summary>
        <textarea
          className="admin-content-qc__textarea"
          rows={10}
          spellCheck={false}
          value={row.draft}
          onChange={(e) => {
            const draft = e.target.value;
            setRow((prev) => ({ ...prev, draft, dirty: draft !== prev.saved }));
          }}
        />
        <div className="admin-content-qc__raw-actions">
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy !== null || !cf?.metadataWritable}
            onClick={() => runFixLatex(target)}
          >
            {busy === `fix-${target}` ? "Fixing…" : isSolution ? "Fix solution LaTeX" : "Fix LaTeX (LLM)"}
          </button>
          <button
            type="button"
            className="btn btn-sm"
            disabled={row.draft === row.baseline || busy !== null}
            onClick={() => resetRaw(target)}
          >
            Reset
          </button>
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy !== null}
            onClick={() => load()}
          >
            Reload from disk
          </button>
          <button
            type="button"
            className="btn btn-sm primary"
            disabled={saveDisabled}
            onClick={() => runSave(target)}
          >
            {busy === `save-${target}` ? "Saving…" : isSolution ? "Save solution" : "Save raw text"}
          </button>
        </div>
        <p className="admin-content-qc__hint muted">
          {isSolution ? (
            <>
              Fix the worked solution steps. Use <code>{"{{asset:0}}"}</code> on its own line for figures.
            </>
          ) : (
            <>
              Match the PDF on the right. Use <code>{"{{asset:0}}"}</code> on its own line for diagrams.
            </>
          )}
        </p>
      </details>
    );
  }

  if (loading && !cf) {
    return (
      <section className="admin-content-qc glass-card">
        <p className="muted">Loading question data…</p>
      </section>
    );
  }

  if (!cf) {
    return (
      <section className="admin-content-qc glass-card">
        <h2 className="admin-page__section-title">Fix question</h2>
        <p className="admin-page__section-desc muted">
          No PDF source data found for this question. Use the <strong>Quick override</strong> tab to
          edit text directly.
        </p>
        {error && <p className="admin-page__folder-hint admin-page__folder-hint--error">{error}</p>}
      </section>
    );
  }

  return (
    <section className="admin-content-qc glass-card">
      <div className="admin-content-qc__head">
        <h2 className="admin-page__section-title">Fix question</h2>
        <span className={`admin-content-qc__pill admin-content-qc__pill--${cf.renderMode || "image"}`}>
          {cf.answer ? `Answer: ${cf.answer}` : cf.renderMode || "image"}
        </span>
      </div>
      {!cf.metadataWritable && (
        <p className="admin-content-qc__lead muted admin-content-qc__lead--warn">
          Read-only — saving requires <code>EXTRACTOR_ROOT</code> on the server. You can still preview
          and use <strong>Quick override</strong> to edit.
        </p>
      )}
      {!cf.contentRenderApproved && (
        <p className="admin-content-qc__lead muted admin-content-qc__lead--warn">
          <strong>Not approved in pdf-qa-extractor yet</strong> — draft MinerU/parsed text. Fix here,
          then approve there for pack export. Use <strong>Update student view</strong> to push this
          draft into Mongo so the practice page shows text (not the PDF crop).
        </p>
      )}
      {(cf.studentViewStale || cf.solutionViewStale) && (
        <div className="admin-content-qc__stale-banner">
          <p className="admin-content-qc__lead admin-content-qc__lead--warn">
            <strong>Student view is out of date.</strong>
            {cf.studentViewStale
              ? " The solve page still shows old text, missing 1–4 choices, or a different figure than PDF metadata."
              : ""}
            {cf.solutionViewStale
              ? " The official solution still shows the PDF image instead of extracted LaTeX text."
              : ""}
            {cf.studentViewLocked
              ? " A manual override is locked — use Quick override → Restore from PDF data."
              : " Update the student view to sync from metadata."}
          </p>
          {!cf.studentViewLocked && (
            <button
              type="button"
              className="btn btn-sm primary"
              disabled={busy !== null}
              onClick={() => syncStudentView()}
            >
              {busy === "sync-student" ? "Updating…" : "Update student view"}
            </button>
          )}
        </div>
      )}
      {(error || status) && (
        <p className={error ? "admin-page__folder-hint admin-page__folder-hint--error" : "admin-question-saved"}>
          {error || status}
        </p>
      )}

      <div className="admin-content-qc__section-tabs" role="tablist" aria-label="Question or solution">
        <button
          type="button"
          role="tab"
          aria-selected={fixSection === "question"}
          className={`admin-content-qc__section-tab${fixSection === "question" ? " admin-content-qc__section-tab--active" : ""}`}
          onClick={() => setFixSection("question")}
        >
          Question
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={fixSection === "solution"}
          className={`admin-content-qc__section-tab${fixSection === "solution" ? " admin-content-qc__section-tab--active" : ""}`}
          onClick={() => setFixSection("solution")}
        >
          Solution
        </button>
      </div>

      {fixSection === "question" && (
      <article className="admin-content-qc__block">
        <header className="admin-content-qc__block-head">
          <h3>Question</h3>
          <span className="muted">{metaLine(cf)}</span>
        </header>
        {cf.studentViewStale && metadataStem ? (
          <div className="admin-content-qc__metadata-preview">
            {renderMcqPreview(
              metadataStem,
              metadataOptions,
              "Structured version (PDF metadata)",
              metadataPreviewPlacements,
              metadataHybridUrl,
              metadataPreviewProps,
              [],
              [],
              cf.statements ?? []
            )}
          </div>
        ) : null}
        <div className="admin-content-qc__grid">
          {renderMcqPreview(
            studentStem,
            studentOptions,
            cf.studentViewStale ? "How students see it (live)" : "How students see it",
            studentPreviewPlacements,
            studentHybridUrl,
            studentPreviewProps,
            cf.mongoMatchListA ?? [],
            cf.mongoMatchListB ?? [],
            cf.mongoStatements ?? []
          )}
          <div className="admin-content-qc__pane admin-content-qc__pane--source">
            <div className="admin-content-qc__pane-label">Original PDF crop</div>
            <div className="admin-content-qc__pane-body admin-content-qc__pane-body--image">
              {cf.questionImageUrl ? (
                <AdminAuthImage
                  src={cf.questionImageUrl}
                  alt="Question source crop"
                  className="admin-content-qc__source-img"
                />
              ) : (
                <p className="muted">No source crop URL.</p>
              )}
              {cf.mineruDiagramUrls.length > 0 && (
                <div className="admin-content-qc__diagrams">
                  <p className="admin-content-qc__diagrams-label">Figure extracts</p>
                  {cf.mineruDiagramUrls.map((url) => (
                    <AdminAuthImage
                      key={url}
                      src={url}
                      alt="Diagram extract"
                      className="admin-content-qc__diagram-img"
                    />
                  ))}
                </div>
              )}
            </div>
            {renderRawEditor("question")}
            {renderAssetList("question")}
          </div>
        </div>
      </article>
      )}

      {fixSection === "solution" && (
        <article className="admin-content-qc__block">
          <header className="admin-content-qc__block-head">
            <h3>Solution</h3>
            <span className="muted">Worked steps students see after checking the answer</span>
          </header>
          <div className="admin-content-qc__grid">
            <div className="admin-content-qc__col">
              <div className="admin-content-qc__pane">
                <div className="admin-content-qc__pane-label">
                  {solutionRaw.dirty ? "Editor preview (unsaved)" : "Preview"}
                </div>
                <div className="admin-content-qc__pane-body">
                  {solutionRaw.dirty && (
                    <p className="admin-content-qc__hint muted">
                      Live student view may differ until you save and use &quot;Update student view&quot;.
                    </p>
                  )}
                  {editorSolutionText ? (
                    <InlineAssetMarkdown
                      text={solutionPreviewText}
                      questionId={cf.questionId}
                      assetPlacements={previewSolutionPlacements(cf)}
                      markdownClass="admin-content-qc__markdown"
                      diagramAlt="Solution figure"
                      preformatted
                    />
                  ) : (
                    <p className="muted">
                      No solution text yet — edit on the right or fix LaTeX from the PDF crop.
                    </p>
                  )}
                </div>
              </div>
              {solutionLiveDiffers ? (
                <div className="admin-content-qc__pane">
                  <div className="admin-content-qc__pane-label">How students see it (live)</div>
                  <div className="admin-content-qc__pane-body">
                    {cf.solutionViewStale && (
                      <p className="admin-content-qc__hint muted">
                        Student DB differs from metadata — save or use &quot;Update student view&quot; to sync.
                      </p>
                    )}
                    <InlineAssetMarkdown
                      text={displayPyqSolution(studentSolutionText, {
                        contentTextNormalized: cf.contentTextNormalized,
                        renderMode: cf.renderMode,
                      })}
                      questionId={cf.questionId}
                      assetPlacements={studentSolutionPlacements(cf)}
                      markdownClass="admin-content-qc__markdown"
                      diagramAlt="Solution figure"
                      preformatted
                    />
                  </div>
                </div>
              ) : null}
            </div>
            <div className="admin-content-qc__pane admin-content-qc__pane--source">
              <div className="admin-content-qc__pane-label">Original PDF crop</div>
              <div className="admin-content-qc__pane-body admin-content-qc__pane-body--image">
                {cf.solutionImageUrl ? (
                  <AdminAuthImage
                    src={cf.solutionImageUrl}
                    alt="Solution source crop"
                    className="admin-content-qc__source-img"
                  />
                ) : (
                  <p className="muted">No solution PDF crop — edit from the text box below.</p>
                )}
              </div>
              {renderRawEditor("solution")}
              {renderAssetList("solution")}
            </div>
          </div>
        </article>
      )}

      {cropSession && (cropSession.target === "question" ? cf.questionImageUrl : cf.solutionImageUrl) ? (
        <SourceImageCropDialog
          open
          imageUrl={
            cropSession.target === "question" ? cf.questionImageUrl : cf.solutionImageUrl
          }
          title={
            cropSession.mode === "add"
              ? "Crop figure from source image"
              : `Re-crop {{asset:${cropSession.index}}}`
          }
          initialBbox={cropSession.initialBbox}
          busy={busy === "crop-asset"}
          confirmLabel={cropSession.mode === "add" ? "Add figure" : `Save asset:${cropSession.index}`}
          onCancel={() => busy !== "crop-asset" && setCropSession(null)}
          onConfirm={applyCrop}
        />
      ) : null}
    </section>
  );
}
