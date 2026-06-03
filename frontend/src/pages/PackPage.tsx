import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { fetchPack, fetchQuestions, PackSummary, QuestionPublic } from "../api";

export default function PackPage() {
  const { packId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const subject = searchParams.get("subject") || "";
  const chapter = searchParams.get("chapter") || "";
  const page = Number(searchParams.get("page") || "0");

  const [pack, setPack] = useState<PackSummary | null>(null);
  const [questions, setQuestions] = useState<QuestionPublic[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPack(packId)
      .then((p) => setPack(p as PackSummary))
      .catch((e) => setError(e.message));
  }, [packId]);

  useEffect(() => {
    fetchQuestions(packId, { subject: subject || undefined, chapter: chapter || undefined, page, size: 24 })
      .then((res) => {
        setQuestions(res.content);
        setTotalPages(res.totalPages);
      })
      .catch((e) => setError(e.message));
  }, [packId, subject, chapter, page]);

  const subjects = pack?.facets?.subjects || [];
  const chapters = (pack?.facets?.chapters || []).filter(
    (c) => !subject || c.subject === subject
  );

  function setFilter(key: "subject" | "chapter", value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "subject") next.delete("chapter");
    next.set("page", "0");
    setSearchParams(next);
  }

  return (
    <div>
      <p>
        <Link to="/">← All exams</Link>
      </p>
      <h1>
        {pack?.exam} {pack?.year}
      </h1>
      {error && <p className="error-text">{error}</p>}

      <div className="filters">
        <label>
          Subject
          <select value={subject} onChange={(e) => setFilter("subject", e.target.value)}>
            <option value="">All</option>
            {subjects.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name} ({s.count})
              </option>
            ))}
          </select>
        </label>
        <label>
          Chapter
          <select value={chapter} onChange={(e) => setFilter("chapter", e.target.value)} disabled={!subject}>
            <option value="">All</option>
            {chapters.map((c) => (
              <option key={`${c.subject}-${c.chapter}`} value={c.chapter}>
                {c.chapter} ({c.count})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="question-grid">
        {questions.map((q) => (
          <Link key={q.questionId} to={`/question/${q.questionId}`} className="card question-card">
            <div className="q-thumb-wrap">
              {q.questionImageUrl ? (
                <img src={q.questionImageUrl} alt="" className="q-thumb" loading="lazy" />
              ) : (
                <div className="q-thumb placeholder">No image</div>
              )}
            </div>
            <div className="q-meta">
              <strong>Q{q.questionNo}</strong>
              <span className="muted">
                {q.subject}
                {q.chapter ? ` · ${q.chapter}` : ""}
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="pager">
        <button
          type="button"
          className="btn"
          disabled={page <= 0}
          onClick={() => {
            const next = new URLSearchParams(searchParams);
            next.set("page", String(page - 1));
            setSearchParams(next);
          }}
        >
          Previous
        </button>
        <span className="muted">
          Page {page + 1} / {Math.max(totalPages, 1)}
        </span>
        <button
          type="button"
          className="btn"
          disabled={page + 1 >= totalPages}
          onClick={() => {
            const next = new URLSearchParams(searchParams);
            next.set("page", String(page + 1));
            setSearchParams(next);
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
