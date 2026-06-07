import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  fetchSessionResult,
  SessionQuestionReview,
  SessionResultView,
} from "../api";
import { useAuth } from "../auth/AuthContext";
import ProductModeBanner from "../components/ProductModeBanner";
import SessionQuestionNav from "../components/SessionQuestionNav";
import SessionQuestionReviewPanel from "../components/SessionQuestionReviewPanel";
import { MODES, type ProductMode } from "../navigation/modes";
import { weakChapterPracticeUrl } from "../utils/weakChapters";

type Props = {
  mode: ProductMode;
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function SessionResultPage({ mode }: Props) {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, refreshProgress } = useAuth();
  const [result, setResult] = useState<SessionResultView | null>(null);
  const [error, setError] = useState("");
  const [review, setReview] = useState<SessionQuestionReview | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/${mode === "test" ? "test" : "practice"}/result/${sessionId}`)}`);
      return;
    }
    fetchSessionResult(sessionId)
      .then((data) => {
        setResult(data);
        refreshProgress();
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load results"));
  }, [user, authLoading, sessionId, navigate, mode, refreshProgress]);

  const tiles = useMemo(() => result?.session.questionTiles ?? [], [result]);
  const weak = result?.weakChaptersInSession?.[0] ?? null;
  const practiceWeakUrl = weak
    ? weakChapterPracticeUrl(weak, result?.session.packId)
    : "/practice";

  if (authLoading || (!result && !error)) {
    return (
      <main className="session-result-page pt-4">
        <p className="muted">Loading results…</p>
      </main>
    );
  }

  if (error || !result) {
    return (
      <main className="session-result-page pt-4">
        <p className="error-text">{error || "Results not found"}</p>
        <Link to={mode === "test" ? "/test/create" : "/practice"} className="btn mt-md">
          Go back
        </Link>
      </main>
    );
  }

  const { session } = result;
  const isPractice = mode === "practice";

  function openReview(questionId: string) {
    const item = result?.questionReviews.find((r) => r.questionId === questionId);
    if (item) setReview(item);
  }

  return (
    <main className={`session-result-page session-result-page--${mode} pt-4 lg:pt-6`}>
      <ProductModeBanner mode={mode} />

      <header className="session-result-hero glass-card">
        <p className="session-result-hero__eyebrow">{isPractice ? "Practice complete" : "Test complete"}</p>
        <h1 className="session-result-hero__title">
          {isPractice ? "Practice Complete" : "Test Complete"}
        </h1>
        <p className="session-result-hero__subline">
          {session.totalMarks}/{session.maxMarks} marks · {result.accuracyPercent}% accuracy
        </p>
        <p className="session-result-hero__sub">
          {isPractice
            ? result.countsForRank
              ? "This session counts toward your leaderboard rank."
              : "Scored session complete."
            : "Self-assessment — does not affect leaderboard rank."}
        </p>
        <dl className="session-result-stats">
          <div>
            <dt>Correct</dt>
            <dd>{session.correctCount}</dd>
          </div>
          <div>
            <dt>Wrong</dt>
            <dd>{session.wrongCount}</dd>
          </div>
          <div>
            <dt>Skipped</dt>
            <dd>{session.skipCount ?? 0}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd>{formatDuration(result.timeTakenSeconds)}</dd>
          </div>
          {isPractice && (
            <div>
              <dt>Rank impact</dt>
              <dd>{result.countsForRank ? "+/− marks applied" : "None"}</dd>
            </div>
          )}
        </dl>
      </header>

      {tiles.length > 0 && (
        <section className="glass-card session-result-tiles">
          <h2 className="session-result-section__title">Question overview</h2>
          <p className="muted session-result-section__hint">Tap a tile to review that question.</p>
          <SessionQuestionNav
            tiles={tiles}
            activeQuestionId={review?.questionId ?? ""}
            onSelect={openReview}
            showMarked={mode === "test"}
            markedIds={session.markedForReviewIds}
          />
        </section>
      )}

      {result.aiInsights.length > 0 && (
        <section className="glass-card session-result-insights">
          <h2 className="session-result-section__title">AI insights</h2>
          <ul className="session-result-insights__list">
            {result.aiInsights.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="session-result-cards">
        {result.weakChaptersInSession.length > 0 && (
          <section className="glass-card session-result-card">
            <h2 className="session-result-section__title">Weak chapters</h2>
            <ul className="session-result-chapters">
              {result.weakChaptersInSession.map((c) => (
                <li key={`${c.subject}-${c.chapter}`}>
                  <span>{c.chapter}</span>
                  <span className="session-result-chapters__pct">{c.accuracyPercent}%</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {result.strongChaptersInSession.length > 0 && (
          <section className="glass-card session-result-card">
            <h2 className="session-result-section__title">Strong chapters</h2>
            <ul className="session-result-chapters">
              {result.strongChaptersInSession.map((c) => (
                <li key={`${c.subject}-${c.chapter}`}>
                  <span>{c.chapter}</span>
                  <span className="session-result-chapters__pct session-result-chapters__pct--good">
                    {c.accuracyPercent}%
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {!isPractice && result.subjectBreakdown.length > 0 && (
        <section className="glass-card session-result-breakdown">
          <h2 className="session-result-section__title">Subject performance</h2>
          <ul className="session-result-breakdown__list">
            {result.subjectBreakdown.map((row) => (
              <li key={row.label}>
                <span>{row.label}</span>
                <span>
                  {row.correct}✓ · {row.wrong}✗ · {row.accuracyPercent}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!isPractice && result.chapterBreakdown.length > 0 && (
        <section className="glass-card session-result-breakdown">
          <h2 className="session-result-section__title">Chapter performance</h2>
          <ul className="session-result-breakdown__list">
            {result.chapterBreakdown.slice(0, 8).map((row) => (
              <li key={`${row.subject}-${row.chapter}`}>
                <span>
                  {row.chapter} <em className="muted">({row.subject})</em>
                </span>
                <span>
                  {row.correct}✓ · {row.wrong}✗ · {row.accuracyPercent}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isPractice && weak && (
        <section className="glass-card session-result-card">
          <h2 className="session-result-section__title">Recommended next practice</h2>
          <p className="muted">
            Drill {weak.chapter} — {weak.accuracyPercent}% accuracy this session.
          </p>
          <Link to={practiceWeakUrl} className="btn primary">
            Practice weak area
          </Link>
        </section>
      )}

      <section className="session-result-actions glass-card">
        <h2 className="session-result-section__title">What&apos;s next?</h2>
        <div className="session-result-actions__grid">
          {isPractice ? (
            <>
              <Link
                to={`/review/wrong-attempts?${new URLSearchParams({ sessionId, mode: "practice" }).toString()}`}
                className="btn primary"
              >
                Review mistakes
              </Link>
              <Link to={practiceWeakUrl} className="btn">
                Retry session
              </Link>
              <Link to="/practice" className="btn">
                Back to Practice Hub
              </Link>
            </>
          ) : (
            <>
              <Link to="/test/create" className="btn primary">
                Retake test
              </Link>
              <Link to="/test/create" className="btn">
                Create custom test
              </Link>
            </>
          )}
        </div>
        <p className="muted session-result-actions__hint">
          {MODES[mode].helper}
        </p>
      </section>

      {review && <SessionQuestionReviewPanel review={review} onClose={() => setReview(null)} />}
    </main>
  );
}
