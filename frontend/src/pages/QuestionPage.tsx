import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchQuestion, fetchQuestions, QuestionDetail, QuestionPublic } from "../api";
import { difficultyLabel, examDisplayName, marksLabel } from "../utils/labels";

export default function QuestionPage() {
  const { questionId = "" } = useParams();
  const navigate = useNavigate();
  const [q, setQ] = useState<QuestionDetail | null>(null);
  const [siblings, setSiblings] = useState<QuestionPublic[]>([]);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setQ(null);
    setError("");
    setRevealed(false);
    if (!questionId) return;
    let cancelled = false;
    fetchQuestion(questionId)
      .then((data) => {
        if (!cancelled) setQ(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [questionId]);

  useEffect(() => {
    if (!q?.packId) return;
    let cancelled = false;
    fetchQuestions(q.packId, { size: 300 })
      .then((res) => {
        if (!cancelled) setSiblings(res.content);
      })
      .catch(() => {
        if (!cancelled) setSiblings([]);
      });
    return () => {
      cancelled = true;
    };
  }, [q?.packId]);

  const nav = useMemo(() => {
    const idx = siblings.findIndex((p) => p.questionId === questionId);
    return {
      idx,
      prev: idx > 0 ? siblings[idx - 1] : null,
      next: idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null,
      total: siblings.length,
    };
  }, [siblings, questionId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space" && q && !revealed) {
        e.preventDefault();
        setRevealed(true);
        return;
      }
      if (e.key === "ArrowLeft" && nav.prev) navigate(`/question/${nav.prev.questionId}`);
      if (e.key === "ArrowRight" && nav.next) navigate(`/question/${nav.next.questionId}`);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q, revealed, nav, navigate]);

  function imageSrc(url: string) {
    if (!url) return "";
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}v=${encodeURIComponent(questionId)}`;
  }

  function close() {
    if (q) navigate(`/pack/${q.packId}`);
    else navigate(-1);
  }

  if (error) {
    return (
      <div className="modal-backdrop" onClick={close}>
        <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
          <p className="error-text">{error}</p>
          <button type="button" className="btn" onClick={close}>
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!q) {
    return (
      <div className="modal-backdrop">
        <div className="modal-dialog">
          <p className="muted">Loading question…</p>
        </div>
      </div>
    );
  }

  const diff = difficultyLabel(q.difficulty);
  const position = nav.idx >= 0 ? nav.idx + 1 : q.questionNo;

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <header className="modal-header">
          <div>
            <h2>
              {examDisplayName(q.exam, q.year)} · {q.year}
            </h2>
            <span className={`badge badge-${diff.toLowerCase()}`}>{diff}</span>
          </div>
          <div className="modal-header-right">
            <span className="modal-progress">
              {position} / {nav.total || "—"}
            </span>
            <button type="button" className="modal-close" onClick={close} aria-label="Close">
              ×
            </button>
          </div>
        </header>

        <div className="modal-meta">
          <span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 7v14M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
            </svg>
            {q.chapter || q.subject}
          </span>
          {q.topic && (
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              </svg>
              {q.topic}
            </span>
          )}
          <span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
            </svg>
            {q.year}
          </span>
          <span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
            </svg>
            {marksLabel(q.difficulty, q.questionNo)}
          </span>
        </div>

        <section className="modal-question">
          <p className="modal-section-label">Question</p>
          <div className="modal-question-body">
            {q.questionImageUrl ? (
              <img
                key={`q-${q.questionId}`}
                src={imageSrc(q.questionImageUrl)}
                alt={`Question ${q.questionNo}`}
                className="modal-img"
              />
            ) : (
              <p className="modal-placeholder">
                Q{q.questionNo}: {q.topic || q.chapter || q.subject}
              </p>
            )}
          </div>

          {!revealed ? (
            <button type="button" className="btn show-answer-btn" onClick={() => setRevealed(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Show Answer
              <span className="kbd-hint">(Space)</span>
            </button>
          ) : (
            <div className="modal-answer">
              <p className="modal-section-label">Answer</p>
              <p className="modal-answer-text">
                <strong>Correct option:</strong> {q.answer || "—"}
              </p>
              {q.hasSolution && q.solutionImageUrl && (
                <img
                  key={`s-${q.questionId}`}
                  src={imageSrc(q.solutionImageUrl)}
                  alt={`Solution for question ${q.questionNo}`}
                  className="modal-img"
                />
              )}
            </div>
          )}
        </section>

        <footer className="modal-footer">
          <button
            type="button"
            className="btn btn-nav"
            disabled={!nav.prev}
            onClick={() => nav.prev && navigate(`/question/${nav.prev.questionId}`)}
          >
            ← Prev
          </button>
          <span className="modal-nav-hint">Swipe or tap to navigate</span>
          <button
            type="button"
            className="btn btn-nav btn-primary-nav"
            disabled={!nav.next}
            onClick={() => nav.next && navigate(`/question/${nav.next.questionId}`)}
          >
            Next →
          </button>
        </footer>
      </div>
    </div>
  );
}
