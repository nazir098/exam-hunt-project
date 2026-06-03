import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchQuestion, QuestionDetail } from "../api";

type Mode = "study" | "practice";

export default function QuestionPage() {
  const { questionId = "" } = useParams();
  const [q, setQ] = useState<QuestionDetail | null>(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<Mode>("study");
  const [revealed, setRevealed] = useState(false);
  const [practiceChoice, setPracticeChoice] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setRevealed(false);
    setSubmitted(false);
    setPracticeChoice("");
    fetchQuestion(questionId)
      .then(setQ)
      .catch((e) => setError(e.message));
  }, [questionId]);

  function onPracticeSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  const showAnswer = mode === "study" ? revealed : submitted;
  const correct =
    submitted && q?.answer && practiceChoice.trim().toLowerCase() === q.answer.trim().toLowerCase();

  if (error) return <p className="error-text">{error}</p>;
  if (!q) return <p className="muted">Loading…</p>;

  return (
    <div className="question-detail">
      <p>
        <Link to={`/pack/${q.packId}`}>← Back to {q.exam} {q.year}</Link>
      </p>
      <h1>
        Q{q.questionNo} — {q.subject}
      </h1>
      {q.chapter && <p className="muted">{q.chapter}</p>}

      <div className="mode-tabs">
        <button
          type="button"
          className={mode === "study" ? "tab active" : "tab"}
          onClick={() => {
            setMode("study");
            setSubmitted(false);
          }}
        >
          Study
        </button>
        <button
          type="button"
          className={mode === "practice" ? "tab active" : "tab"}
          onClick={() => {
            setMode("practice");
            setRevealed(false);
          }}
        >
          Practice
        </button>
      </div>

      <div className="viewer">
        <figure>
          <figcaption>Question</figcaption>
          {q.questionImageUrl ? (
            <img src={q.questionImageUrl} alt="Question" className="viewer-img" />
          ) : (
            <p className="muted">No question image</p>
          )}
        </figure>
        {q.hasSolution && q.solutionImageUrl && (
          <figure>
            <figcaption>Solution</figcaption>
            <img
              src={q.solutionImageUrl}
              alt="Solution"
              className={`viewer-img ${!showAnswer ? "blurred" : ""}`}
            />
          </figure>
        )}
      </div>

      {mode === "study" && (
        <button type="button" className="btn primary" onClick={() => setRevealed(true)} disabled={revealed}>
          {revealed ? "Answer revealed" : "Reveal answer"}
        </button>
      )}

      {mode === "practice" && !submitted && (
        <form className="practice-form" onSubmit={onPracticeSubmit}>
          <label>
            Your answer (e.g. 1, 2, a, b)
            <input
              value={practiceChoice}
              onChange={(e) => setPracticeChoice(e.target.value)}
              placeholder="Type option"
              required
            />
          </label>
          <button type="submit" className="btn primary">
            Submit
          </button>
        </form>
      )}

      {showAnswer && (
        <div className={`answer-box ${mode === "practice" ? (correct ? "ok" : "bad") : ""}`}>
          <strong>Correct answer:</strong> {q.answer || "—"}
          {mode === "practice" && submitted && (
            <p>{correct ? "Correct!" : `You chose: ${practiceChoice}`}</p>
          )}
        </div>
      )}

      {q.questionTextPreview && (
        <details className="text-preview">
          <summary>Text preview</summary>
          <p>{q.questionTextPreview}</p>
        </details>
      )}
    </div>
  );
}
