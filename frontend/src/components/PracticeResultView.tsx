import { Link } from "react-router-dom";
import type { ChapterProgress, PracticeSessionView, SessionResultView } from "../api";
import SessionQuestionNav from "./SessionQuestionNav";
import TestResultInsightChips from "./TestResultInsightChips";
import { weakChapterPracticeUrl } from "../utils/weakChapters";

type Props = {
  result: SessionResultView;
  sessionId: string;
  onOpenReview: (questionId: string) => void;
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

function retryPracticeUrl(session: PracticeSessionView): string {
  const params = new URLSearchParams();
  params.set("exam", session.exam || "NEET");
  if (session.packId) params.set("packId", session.packId);
  if (session.filterSubject?.trim()) params.set("subject", session.filterSubject.trim());
  if (session.filterChapter?.trim()) params.set("chapter", session.filterChapter.trim());
  if (session.filterTopic?.trim()) params.set("topic", session.filterTopic.trim());
  return `/practice?${params.toString()}`;
}

function AccuracyRing({ percent }: { percent: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="practice-result-ring" role="img" aria-label={`${clamped}% accuracy`}>
      <svg className="practice-result-ring__svg" viewBox="0 0 96 96" aria-hidden>
        <circle className="practice-result-ring__track" cx="48" cy="48" r={radius} />
        <circle
          className="practice-result-ring__fill"
          cx="48"
          cy="48"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="practice-result-ring__center">
        <strong>{clamped}%</strong>
        <span>Accuracy</span>
      </div>
    </div>
  );
}

function WeakChaptersCard({ chapters }: { chapters: ChapterProgress[] }) {
  if (chapters.length === 0) return null;

  return (
    <section className="glass-card practice-result-weak" aria-label="Weak chapters">
      <h2 className="practice-result-section__title">Weak chapters</h2>
      <ul className="practice-result-weak__list">
        {chapters.map((chapter) => (
          <li key={`${chapter.subject}-${chapter.chapter}`}>
            <span className="practice-result-weak__name">{chapter.chapter}</span>
            <span className="practice-result-weak__pct">{chapter.accuracyPercent}%</span>
          </li>
        ))}
      </ul>
      <Link to="/analytics" className="practice-result-weak__all">
        View all weak areas
        <span className="material-symbols-outlined" aria-hidden>
          arrow_forward
        </span>
      </Link>
    </section>
  );
}

function RecommendedPracticeCard({
  weak,
  packId,
}: {
  weak: ChapterProgress | null;
  packId: string;
}) {
  if (!weak) return null;

  const href = weakChapterPracticeUrl(weak, packId);

  return (
    <section className="glass-card practice-result-recommend" aria-label="Recommended next practice">
      <h2 className="practice-result-section__title">Recommended next practice</h2>
      <p className="practice-result-recommend__copy muted">
        Drill <strong>{weak.chapter}</strong> — {weak.accuracyPercent}% accuracy this session.
      </p>
      <Link to={href} className="btn primary practice-result-recommend__cta">
        Practice weak area
        <span className="material-symbols-outlined" aria-hidden>
          arrow_forward
        </span>
      </Link>
    </section>
  );
}

export default function PracticeResultView({
  result,
  sessionId,
  onOpenReview,
}: Props) {
  const { session } = result;
  const tiles = session.questionTiles ?? [];
  const weak = result.weakChaptersInSession[0] ?? null;
  const retryUrl = retryPracticeUrl(session);
  const mistakesUrl = `/review/wrong-attempts?${new URLSearchParams({
    sessionId,
    mode: "practice",
  }).toString()}`;

  return (
    <>
      <header className="glass-card practice-result-hero">
        <div className="practice-result-hero__top">
          <div className="practice-result-hero__intro">
            <p className="practice-result-hero__eyebrow">Practice complete</p>
            <h1 className="practice-result-hero__title">Practice Complete</h1>
            <p className="practice-result-hero__subline">
              {session.totalMarks}/{session.maxMarks} marks · {result.accuracyPercent}% accuracy
            </p>
            {result.countsForRank && (
              <p className="practice-result-hero__note">
                This session counts toward your leaderboard rank.
              </p>
            )}
          </div>
          <AccuracyRing percent={result.accuracyPercent} />
        </div>

        <div className="session-result-stat-grid practice-result-hero__stats" aria-label="Session stats">
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
              <span className="session-result-stat__label">Time taken</span>
              <span className="session-result-stat__value">{formatDuration(result.timeTakenSeconds)}</span>
            </div>
            <div className="session-result-stat">
              <span className="session-result-stat__label">Rank impact</span>
              <span
                className={`session-result-stat__value session-result-stat__value--rank${
                  result.countsForRank ? "" : " session-result-stat__value--muted"
                }`}
                title={result.countsForRank ? "Counts toward leaderboard rank" : "No rank impact"}
              >
                {result.countsForRank ? (
                  <>
                    <span className="material-symbols-outlined" aria-hidden>
                      leaderboard
                    </span>
                    <span>Yes</span>
                  </>
                ) : (
                  "—"
                )}
              </span>
            </div>
          </div>
      </header>

      <TestResultInsightChips
        insights={result.aiInsights}
        weakChapters={result.weakChaptersInSession}
      />

      {(result.weakChaptersInSession.length > 0 || weak) && (
        <div className="practice-result-split">
          <WeakChaptersCard chapters={result.weakChaptersInSession} />
          <RecommendedPracticeCard weak={weak} packId={session.packId} />
        </div>
      )}

      <section className="glass-card practice-result-actions" aria-label="What's next">
        <h2 className="practice-result-section__title">What&apos;s next?</h2>
        <div className="practice-result-actions__grid">
          <Link to={mistakesUrl} className="practice-result-action practice-result-action--primary">
            <span className="material-symbols-outlined" aria-hidden>
              rate_review
            </span>
            Review mistakes
          </Link>
          <Link to={retryUrl} className="practice-result-action">
            <span className="material-symbols-outlined" aria-hidden>
              replay
            </span>
            Retry session
          </Link>
          <Link to="/practice" className="practice-result-action">
            <span className="material-symbols-outlined" aria-hidden>
              home
            </span>
            Back to Hub
          </Link>
        </div>
      </section>

      {tiles.length > 0 && (
        <section className="glass-card practice-result-tiles">
          <SessionQuestionNav
            tiles={tiles}
            activeQuestionId=""
            onSelect={onOpenReview}
            practiceMode
            resultOverview
            hideHeadMeta
          />
        </section>
      )}
    </>
  );
}
