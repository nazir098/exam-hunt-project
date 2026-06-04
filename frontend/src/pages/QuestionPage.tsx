import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { fetchQuestion, fetchQuestions, QuestionDetail, QuestionPublic } from "../api";
import { difficultyLabel, examDisplayName, marksLabel } from "../utils/labels";
import { browsePathFromPack, filterQuestionsForPractice } from "../utils/practice";

const OPTIONS = [
  { label: "A", value: "1" },
  { label: "B", value: "2" },
  { label: "C", value: "3" },
  { label: "D", value: "4" },
];

export default function QuestionPage() {
  const { questionId = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState<QuestionDetail | null>(null);
  const [siblings, setSiblings] = useState<QuestionPublic[]>([]);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("");
  const [revealed, setRevealed] = useState(false);
  const returnQs = searchParams.toString();

  useEffect(() => {
    setQ(null);
    setError("");
    setRevealed(false);
    setSelected("");
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
    fetchQuestions(q.packId, {
      subject: searchParams.get("subject") || undefined,
      chapter: searchParams.get("chapter") || undefined,
      size: 300,
    })
      .then((res) => {
        if (!cancelled) {
          setSiblings(
            filterQuestionsForPractice(res.content, {
              topic: searchParams.get("topic") || undefined,
              difficulty: searchParams.get("difficulty") || undefined,
              q: searchParams.get("q") || undefined,
            })
          );
        }
      })
      .catch(() => {
        if (!cancelled) setSiblings([]);
      });
    return () => {
      cancelled = true;
    };
  }, [q?.packId, returnQs]);

  const goToQuestion = useCallback(
    (id: string) => {
      navigate(`/question/${id}?${new URLSearchParams(searchParams).toString()}`);
    },
    [navigate, searchParams]
  );

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
      if (e.key === "ArrowLeft" && nav.prev) goToQuestion(nav.prev.questionId);
      if (e.key === "ArrowRight" && nav.next) goToQuestion(nav.next.questionId);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nav, goToQuestion]);

  function imageSrc(url: string) {
    if (!url) return "";
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}v=${encodeURIComponent(questionId)}`;
  }

  function backHref() {
    if (q) return browsePathFromPack(q.packId, returnQs);
    return "/bank?exam=NEET";
  }

  function checkAnswer() {
    setRevealed(true);
  }

  const correct = revealed && q?.answer && selected === q.answer.trim();
  const similar = siblings.filter((s) => s.questionId !== questionId).slice(0, 2);

  if (error) {
    return (
      <main className="max-w-[1280px] mx-auto px-margin-mobile md:px-margin-desktop pt-24 pb-32">
        <p className="text-error">{error}</p>
        <Link to={backHref()} className="glass-card inline-block px-md py-sm rounded-xl mt-md">
          ← Back
        </Link>
      </main>
    );
  }

  if (!q) {
    return (
      <main className="max-w-[1280px] mx-auto px-margin-mobile md:px-margin-desktop pt-24 pb-32">
        <p className="text-outline">Loading question…</p>
      </main>
    );
  }

  const diff = difficultyLabel(q.difficulty);

  return (
    <main className="px-margin-mobile lg:px-0 pb-28 lg:pb-8 lg:pt-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md mb-xl">
        <div className="flex flex-wrap items-center gap-xs text-on-surface-variant font-label-md">
          <Link to={backHref()} className="hover:text-primary cursor-pointer transition-colors">
            {q.subject}
          </Link>
          {q.chapter && (
            <>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
              <span className="hover:text-primary cursor-pointer transition-colors">{q.chapter}</span>
            </>
          )}
          {q.topic && (
            <>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
              <span className="text-primary font-bold">{q.topic}</span>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-sm">
          <span className="px-3 py-1 rounded-full bg-surface-container-high border border-white/10 text-caption text-secondary flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              history_edu
            </span>
            {examDisplayName(q.exam, q.year)} {q.year}
          </span>
          <span className="px-3 py-1 rounded-full bg-surface-container-high border border-white/10 text-caption text-error flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">trending_up</span>
            {diff}
          </span>
          <span className="px-3 py-1 rounded-full bg-surface-container-high border border-white/10 text-caption text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">analytics</span>
            {marksLabel(q.difficulty, q.questionNo)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-gutter">
        <div className="space-y-lg">
          <div className="glass-card rounded-xl p-lg">
            <h1 className="text-headline-md font-headline-md text-on-surface mb-lg">
              Question {q.questionNo}
              {q.topic ? ` · ${q.topic}` : ""}
            </h1>
            <div className="aspect-video w-full rounded-lg bg-surface-deep/50 border border-white/5 flex items-center justify-center overflow-hidden mb-lg">
              {q.questionImageUrl ? (
                <img
                  className="w-full h-full object-contain bg-white"
                  src={imageSrc(q.questionImageUrl)}
                  alt={`Question ${q.questionNo}`}
                />
              ) : (
                <p className="text-outline">No question image</p>
              )}
            </div>
            <div className="flex items-center gap-md p-md bg-primary-container/10 border-l-4 border-primary rounded-r-lg">
              <span className="material-symbols-outlined text-primary">info</span>
              <p className="text-body-sm text-on-surface-variant">
                Published exam images from your verified catalog.
              </p>
            </div>
          </div>

          <div className="flex gap-md">
            <button
              type="button"
              onClick={checkAnswer}
              disabled={revealed && !!correct}
              className={`flex-1 py-4 rounded-xl text-white font-headline-md hover:shadow-[0_0_20px_rgba(138,43,226,0.4)] transition-all active:scale-95 ${
                revealed
                  ? correct
                    ? "success-glow-bg flex items-center justify-center gap-2"
                    : "bg-surface-container-high"
                  : "bg-[linear-gradient(135deg,#8A2BE2_0%,#4B0082_100%)]"
              }`}
            >
              {revealed && correct && (
                <span className="material-symbols-outlined mr-2">check_circle</span>
              )}
              {revealed ? (correct ? "Correct Answer" : "View result") : "Check Answer"}
            </button>
            <button
              type="button"
              className="px-8 py-4 rounded-xl border border-white/10 glass-card text-on-surface hover:bg-white/5 transition-all active:scale-95 flex items-center gap-2"
              disabled
            >
              <span className="material-symbols-outlined">bookmark</span>
              Save for Revision
            </button>
          </div>
        </div>

        <div className="space-y-md">
          <div className="text-label-md text-on-surface-variant uppercase tracking-widest mb-sm">Select One Option</div>
          <div className="space-y-sm">
            {OPTIONS.map((opt) => {
              const active = selected === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelected(opt.value)}
                  className={`glass-card p-lg rounded-xl flex items-center gap-md w-full text-left transition-all border ${
                    active
                      ? "bg-primary/10 border-primary"
                      : "border-transparent hover:bg-white/5"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold ${
                      active
                        ? "bg-primary text-on-primary border-primary"
                        : "border-white/20 text-on-surface-variant"
                    }`}
                  >
                    {opt.label}
                  </div>
                  <span className="text-body-md text-on-surface">Option {opt.label}</span>
                </button>
              );
            })}
          </div>
          <div className="flex lg:hidden flex-col gap-sm mt-lg">
            <button
              type="button"
              onClick={checkAnswer}
              className="w-full py-4 rounded-xl bg-[linear-gradient(135deg,#8A2BE2_0%,#4B0082_100%)] text-white font-headline-md active:scale-95 transition-transform"
            >
              Check Answer
            </button>
            <button
              type="button"
              className="w-full py-4 rounded-xl border border-white/10 glass-card text-on-surface active:scale-95 flex justify-center items-center gap-2"
              disabled
            >
              <span className="material-symbols-outlined">bookmark</span>
              Save for Revision
            </button>
          </div>
        </div>
      </div>

      <div
        className={`mt-xxl transition-all duration-700 ${
          revealed ? "opacity-100 translate-y-0" : "hidden opacity-0 translate-y-4"
        }`}
      >
        <div className="mb-lg flex items-center gap-md">
          <div className="h-px flex-1 bg-white/10" />
          <h2 className="text-headline-md font-headline-md text-secondary">Step-by-Step Solution</h2>
          <div className="h-px flex-1 bg-white/10" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          <div className="lg:col-span-8 space-y-md">
            <div className="glass-card p-lg rounded-xl space-y-lg">
              <p className="text-body-md">
                <strong>Correct option:</strong> {OPTIONS.find((o) => o.value === q.answer)?.label || q.answer || "—"}
                {selected && (
                  <>
                    {" "}
                    · You chose <strong>{OPTIONS.find((o) => o.value === selected)?.label || selected}</strong>
                  </>
                )}
              </p>
              {q.hasSolution && q.solutionImageUrl && (
                <div className="aspect-video w-full rounded-lg overflow-hidden border border-white/5 bg-white">
                  <img
                    className="w-full h-full object-contain"
                    src={imageSrc(q.solutionImageUrl)}
                    alt={`Solution ${q.questionNo}`}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="lg:col-span-4">
            <div className="glass-card rounded-xl p-lg sticky top-24">
              <div className="flex items-center justify-between mb-lg">
                <h3 className="text-headline-md font-headline-md">Similar Problems</h3>
                <span className="text-primary material-symbols-outlined">arrow_forward</span>
              </div>
              <div className="space-y-md overflow-x-auto hide-scrollbar">
                {similar.length === 0 ? (
                  <p className="text-caption text-outline">No similar questions in this filter.</p>
                ) : (
                  similar.map((s) => (
                    <Link
                      key={s.questionId}
                      to={`/question/${s.questionId}?${returnQs}`}
                      className="p-md rounded-lg bg-surface-deep/50 border border-white/5 hover:border-primary/20 transition-all cursor-pointer block"
                    >
                      <div className="text-caption text-secondary mb-2">
                        {examDisplayName(s.exam, s.year)} {s.year}
                      </div>
                      <p className="text-body-sm line-clamp-2">
                        Q{s.questionNo} — {s.chapter || s.subject}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="flex items-center justify-between mt-xxl pt-lg border-t border-white/5">
        <button
          type="button"
          className="px-md py-sm rounded-xl border border-white/10 glass-card text-on-surface disabled:opacity-40"
          disabled={!nav.prev}
          onClick={() => nav.prev && goToQuestion(nav.prev.questionId)}
        >
          ← Previous
        </button>
        <span className="text-caption text-outline">
          {nav.idx >= 0 ? nav.idx + 1 : q.questionNo} / {nav.total || "—"}
        </span>
        <button
          type="button"
          className="px-6 py-2 bg-gradient-to-br from-[#8A2BE2] to-[#4B0082] rounded-lg text-white font-bold disabled:opacity-40"
          disabled={!nav.next}
          onClick={() => nav.next && goToQuestion(nav.next.questionId)}
        >
          Next →
        </button>
      </footer>
    </main>
  );
}
