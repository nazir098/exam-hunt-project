import { Link } from "react-router-dom";
import type { ChapterProgress, PracticeSessionView } from "../api";
import { formatPackLabel } from "../utils/practiceHub";

export type BankSessionStart = {
  packId: string;
  subject?: string;
  chapter?: string;
  topic?: string;
  difficulty?: string;
  questionCount: number;
  adaptive?: boolean;
};

type Props = {
  weakChapters: ChapterProgress[];
  resumeSession?: PracticeSessionView | null;
  resumeUrl?: string | null;
  packLabel?: string;
  learningInsightText?: string;
  learningInsightHighlight?: string;
  signedIn: boolean;
  onPracticeWeakAreas: () => void;
  onApplyWeakChapter: (chapter: ChapterProgress) => void;
};

function sessionProgress(session: PracticeSessionView): number {
  const answered = session.correctCount + session.wrongCount + session.skipCount;
  if (session.questionCount <= 0) return 0;
  return Math.min(100, Math.round((answered / session.questionCount) * 100));
}

function answeredCount(session: PracticeSessionView): number {
  return session.correctCount + session.wrongCount + session.skipCount;
}

export default function PracticeBankCoachRail({
  weakChapters,
  resumeSession,
  resumeUrl,
  packLabel,
  learningInsightText,
  learningInsightHighlight,
  signedIn,
  onPracticeWeakAreas,
  onApplyWeakChapter,
}: Props) {
  const weakPrimary = weakChapters[0] ?? null;
  const hasResume = Boolean(resumeSession && resumeUrl);
  const progress = resumeSession ? sessionProgress(resumeSession) : 0;
  const answered = resumeSession ? answeredCount(resumeSession) : 0;

  const weakChapterName = weakPrimary?.chapter ?? learningInsightHighlight ?? "Wave Optics";
  const weakAccuracy = weakPrimary?.accuracyPercent ?? 0;
  const weakSubject = weakPrimary?.subject;

  return (
    <div className="practice-bank-coach">
      <section
        className={`practice-bank-widget practice-bank-widget--resume glass-card${hasResume ? "" : " practice-bank-widget--empty"}`}
        aria-label="Continue session"
      >
        <div className="practice-bank-widget__head">
          <span className="material-symbols-outlined">play_circle</span>
          <h3>Continue session</h3>
        </div>
        <div className="practice-bank-widget__progress" aria-hidden>
          <div className="practice-bank-widget__progress-fill" style={{ width: `${progress}%` }} />
        </div>
        {hasResume && resumeSession ? (
          <>
            <p className="practice-bank-widget__meta">
              {formatPackLabel(resumeSession.packId)} · {answered}/{resumeSession.questionCount} completed
            </p>
            <Link to={resumeUrl!} className="btn primary btn-block practice-bank-widget__cta">
              Resume session
            </Link>
          </>
        ) : (
          <>
            <p className="practice-bank-widget__meta">
              {packLabel ? `${packLabel} · ` : ""}
              No session in progress
            </p>
            <button type="button" className="btn btn-block practice-bank-widget__cta practice-bank-widget__cta--muted" disabled>
              Resume session
            </button>
          </>
        )}
      </section>

      <section className="practice-bank-widget practice-bank-widget--weak glass-card" aria-label="Weak chapter">
        <div className="practice-bank-widget__head">
          <span className="material-symbols-outlined">trending_down</span>
          <h3>Weak chapter</h3>
        </div>
        <p className="practice-bank-widget__chapter">{weakChapterName}</p>
        <p className="practice-bank-widget__accuracy">
          {weakAccuracy}% accuracy
          {weakSubject && <span className="practice-bank-widget__subject"> · {weakSubject}</span>}
        </p>
        <button
          type="button"
          className="btn practice-bank-widget__cta practice-bank-widget__cta--outline"
          onClick={() => (weakPrimary ? onApplyWeakChapter(weakPrimary) : onPracticeWeakAreas())}
        >
          Practice now
        </button>
      </section>

      <section className="practice-bank-widget practice-bank-widget--ai glass-card" aria-label="AI recommendation">
        <div className="practice-bank-widget__head">
          <span className="material-symbols-outlined">psychology</span>
          <h3>AI recommendation</h3>
        </div>
        <p className="practice-bank-widget__ai-text">
          {learningInsightText || "Based on your last mock, you should focus on trends from recent PYQs."}{" "}
          {learningInsightHighlight && (
            <strong className="practice-bank-widget__ai-highlight">{learningInsightHighlight}</strong>
          )}
        </p>
        {signedIn ? (
          <Link to="/analytics" className="practice-bank-widget__link">
            View analytics
            <span className="material-symbols-outlined" aria-hidden>
              arrow_forward
            </span>
          </Link>
        ) : (
          <button type="button" className="practice-bank-widget__link" onClick={onPracticeWeakAreas}>
            Practice weak areas
            <span className="material-symbols-outlined" aria-hidden>
              arrow_forward
            </span>
          </button>
        )}
      </section>
    </div>
  );
}
