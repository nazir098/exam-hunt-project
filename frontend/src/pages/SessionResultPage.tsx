import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  fetchSessionResult,
  SessionQuestionReview,
  SessionResultView,
} from "../api";
import { useAuth } from "../auth/AuthContext";
import ProductModeBanner from "../components/ProductModeBanner";
import PageLoadShell from "../components/PageLoadShell";
import SessionQuestionNav from "../components/SessionQuestionNav";
import SessionQuestionReviewPanel from "../components/SessionQuestionReviewPanel";
import TestResultFollowUp from "../components/TestResultFollowUp";
import TestResultReviewEntry from "../components/TestResultReviewEntry";
import TestResultInsightChips from "../components/TestResultInsightChips";
import TestResultRecoveryCard from "../components/TestResultRecoveryCard";
import { MODES, testReviewRoute, type ProductMode } from "../navigation/modes";
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
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading, refreshProgress } = useAuth();
  const prefetched = (location.state as { result?: SessionResultView } | null)?.result;
  const [result, setResult] = useState<SessionResultView | null>(
    prefetched?.session.id === sessionId ? prefetched : null
  );
  const [error, setError] = useState("");
  const [review, setReview] = useState<SessionQuestionReview | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/${mode === "test" ? "test" : "practice"}/result/${sessionId}`)}`);
      return;
    }
    if (prefetched?.session.id === sessionId) {
      void refreshProgress();
      return;
    }
    fetchSessionResult(sessionId)
      .then((data) => {
        setResult(data);
        void refreshProgress();
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load results"));
  }, [user, authLoading, sessionId, navigate, mode, refreshProgress, prefetched]);

  const tiles = useMemo(() => result?.session.questionTiles ?? [], [result]);
  const weak = result?.weakChaptersInSession?.[0] ?? null;
  const practiceWeakUrl = weak
    ? weakChapterPracticeUrl(weak, result?.session.packId)
    : "/practice";

  if (authLoading || (!result && !error)) {
    return (
      <PageLoadShell
        loading
        loaderLabel={mode === "test" ? "Loading test results…" : "Loading results…"}
        loaderHint="Fetching your score and breakdown"
        loaderIcon={mode === "test" ? "assignment_turned_in" : "analytics"}
        loaderMode={mode === "test" ? "test" : "practice"}
        className="session-result-page pt-4"
      >
        {null}
      </PageLoadShell>
    );
  }

  if (error || !result) {
    return (
      <PageLoadShell
        error={error || "Results not found"}
        onRetry={() => {
          setError("");
          fetchSessionResult(sessionId)
            .then((data) => {
              setResult(data);
              void refreshProgress();
            })
            .catch((e) => setError(e instanceof Error ? e.message : "Could not load results"));
        }}
        backHref={mode === "test" ? "/test/create" : "/practice"}
        backLabel="Go back"
        className="session-result-page pt-4"
        loaderMode={mode === "test" ? "test" : "practice"}
      >
        {null}
      </PageLoadShell>
    );
  }

  const { session } = result;
  const isPractice = mode === "practice";

  function openReview(questionId: string) {
    const item = result?.questionReviews.find((r) => r.questionId === questionId);
    if (item) setReview(item);
  }

  if (!isPractice) {
    return (
      <main className="session-result-page session-result-page--test pt-4 lg:pt-6">
        <header className="session-result-hero session-result-hero--test glass-card">
          <div className="session-result-hero__top">
            <span className="session-result-hero__mode-badge">Test Mode</span>
            <span className="session-result-hero__mode-tag">Evaluate</span>
          </div>
          <h1 className="session-result-hero__title">Test Complete</h1>
          <p className="session-result-hero__sub">
            Self-assessment — feeds analytics and weak-area detection, not the leaderboard.
          </p>

          <div className="session-result-stat-grid" aria-label="Test results">
            <div className="session-result-stat session-result-stat--primary">
              <span className="session-result-stat__label">Score</span>
              <span className="session-result-stat__value">
                {session.totalMarks}/{session.maxMarks}
              </span>
            </div>
            <div className="session-result-stat">
              <span className="session-result-stat__label">Accuracy</span>
              <span className="session-result-stat__value">{result.accuracyPercent}%</span>
            </div>
            <div className="session-result-stat">
              <span className="session-result-stat__label">Correct</span>
              <span className="session-result-stat__value session-result-stat__value--ok">
                {session.correctCount}
              </span>
            </div>
            <div className="session-result-stat">
              <span className="session-result-stat__label">Wrong</span>
              <span className="session-result-stat__value session-result-stat__value--bad">
                {session.wrongCount}
              </span>
            </div>
            <div className="session-result-stat">
              <span className="session-result-stat__label">Skipped</span>
              <span className="session-result-stat__value">{session.skipCount ?? 0}</span>
            </div>
            <div className="session-result-stat">
              <span className="session-result-stat__label">Time</span>
              <span className="session-result-stat__value">{formatDuration(result.timeTakenSeconds)}</span>
            </div>
          </div>
        </header>

        <div className="session-result-layout">
          <div className="session-result-layout__main">
            <TestResultReviewEntry sessionId={sessionId} reviews={result.questionReviews} />

            {tiles.length > 0 && (
              <section className="glass-card session-result-tiles">
                <h2 className="session-result-section__title">Quick tile review</h2>
                <SessionQuestionNav
                  tiles={tiles}
                  activeQuestionId=""
                  onSelect={(qid) => navigate(testReviewRoute(sessionId, "all", qid))}
                  showMarked
                  markedIds={session.markedForReviewIds}
                  resultOverview
                />
              </section>
            )}

            <TestResultFollowUp result={result} />
          </div>

          <aside className="session-result-layout__aside">
            <TestResultInsightChips
              insights={result.aiInsights}
              weakChapters={result.weakChaptersInSession}
            />
            <TestResultRecoveryCard
              weakChapters={result.weakChaptersInSession}
              wrongCount={session.wrongCount}
              packId={session.packId}
            />
          </aside>
        </div>
      </main>
    );
  }

  return (
    <main className={`session-result-page session-result-page--${mode} pt-4 lg:pt-6`}>
      <ProductModeBanner mode={mode} />

      <header className="session-result-hero glass-card">
        <p className="session-result-hero__eyebrow">Practice complete</p>
        <h1 className="session-result-hero__title">Practice Complete</h1>
        <p className="session-result-hero__subline">
          {session.totalMarks}/{session.maxMarks} marks · {result.accuracyPercent}% accuracy
        </p>
        <p className="session-result-hero__sub">
          {result.countsForRank
            ? "This session counts toward your leaderboard rank."
            : "Scored session complete."}
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
          <div>
            <dt>Rank impact</dt>
            <dd>{result.countsForRank ? "+/− marks applied" : "None"}</dd>
          </div>
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

      {weak && (
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
        </div>
        <p className="muted session-result-actions__hint">{MODES[mode].helper}</p>
      </section>

      {review && <SessionQuestionReviewPanel review={review} onClose={() => setReview(null)} />}
    </main>
  );
}
