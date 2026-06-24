import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  fetchSessionResult,
  SessionResultView,
} from "../api";
import { useAuth } from "../auth/AuthContext";
import PageLoadShell from "../components/PageLoadShell";
import PracticeResultView from "../components/PracticeResultView";
import SessionQuestionNav from "../components/SessionQuestionNav";
import TestResultFollowUp from "../components/TestResultFollowUp";
import TestResultReviewEntry from "../components/TestResultReviewEntry";
import TestResultInsightChips from "../components/TestResultInsightChips";
import TestResultRecoveryCard from "../components/TestResultRecoveryCard";
import { practiceReviewRoute, testReviewRoute, type ProductMode } from "../navigation/modes";

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
    navigate(practiceReviewRoute(sessionId, questionId));
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
    <main className="session-result-page session-result-page--practice pt-4 lg:pt-6">
      <PracticeResultView
        result={result}
        sessionId={sessionId}
        onOpenReview={openReview}
      />
    </main>
  );
}
