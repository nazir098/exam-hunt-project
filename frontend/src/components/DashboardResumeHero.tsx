import { Link } from "react-router-dom";
import type { PackSummary, PracticeSessionView, ProgressSummary } from "../api";
import { STITCH_ANALYTICS_HERO } from "../design/stitchAssets";
import {
  resumePrimaryLabel,
  sessionAnsweredCount,
  sessionFocusLine,
  sessionPackTitle,
  sessionProgressPercent,
  sessionResumeUrl,
} from "../utils/practiceHub";
import { primaryWeakChapter, weakChapterPracticeUrl } from "../utils/weakChapters";

type Props = {
  name: string;
  topTier: boolean;
  session: PracticeSessionView | null;
  packs: PackSummary[];
  progress: ProgressSummary | null;
};

export default function DashboardResumeHero({ name, topTier, session, packs, progress }: Props) {
  const resumeUrl = session ? sessionResumeUrl(session) : null;
  const weak = primaryWeakChapter(progress?.weakChapters);
  const weakUrl = weak ? weakChapterPracticeUrl(weak) : "/practice?exam=NEET#question-bank";

  const packTitle = session ? sessionPackTitle(session.packId, packs) : "";
  const focusLine = session ? sessionFocusLine(session) : null;
  const progressPct = session ? sessionProgressPercent(session) : 0;
  const questionNo = session ? session.currentIndex + 1 : 0;

  return (
    <section className="dashboard-hero glass-card">
      <div className="dashboard-hero__body">
        <span className="dashboard-badge">Welcome back</span>
        <h1 className="dashboard-hero__title">
          {topTier ? (
            <>
              {name}, you&apos;re on fire — <span className="text-primary">top tier</span> accuracy.
            </>
          ) : (
            <>Hi {name}, let&apos;s sharpen your edge today.</>
          )}
        </h1>
        <p className="dashboard-hero__lead">
          {session
            ? "Pick up where you left off — your session is saved and ready."
            : "Start a scored session or explore PYQs in the question bank."}
        </p>

        {session && resumeUrl ? (
          <div className="dashboard-resume-card">
            <div className="dashboard-resume-card__head">
              <span className="material-symbols-outlined dashboard-resume-card__icon">play_circle</span>
              <div>
                <p className="dashboard-resume-card__eyebrow">Active session</p>
                <h2 className="dashboard-resume-card__title">{packTitle}</h2>
              </div>
            </div>

            <dl className="dashboard-resume-card__stats">
              <div>
                <dt>Progress</dt>
                <dd>
                  Question {questionNo} of {session.questionCount}
                </dd>
              </div>
              {focusLine && (
                <div>
                  <dt>Focus</dt>
                  <dd>{focusLine}</dd>
                </div>
              )}
            </dl>

            <div className="dashboard-resume-card__score">
              <span className="dashboard-resume-card__score-label">Score</span>
              <div className="dashboard-resume-card__chips">
                <span className="dashboard-session-chip dashboard-session-chip--marks">
                  <span className="material-symbols-outlined" aria-hidden>
                    emoji_events
                  </span>
                  {session.totalMarks}/{session.maxMarks} Marks
                </span>
                <span className="dashboard-session-chip dashboard-session-chip--correct">
                  <span className="material-symbols-outlined" aria-hidden>
                    check
                  </span>
                  {session.correctCount} Correct
                </span>
                <span className="dashboard-session-chip dashboard-session-chip--wrong">
                  <span className="material-symbols-outlined" aria-hidden>
                    close
                  </span>
                  {session.wrongCount} Wrong
                </span>
                <span className="dashboard-session-chip dashboard-session-chip--skip">
                  <span className="material-symbols-outlined" aria-hidden>
                    skip_next
                  </span>
                  {session.skipCount ?? 0} Skipped
                </span>
              </div>
            </div>

            <div className="dashboard-resume-card__progress">
              <div className="dashboard-resume-card__progress-meta">
                <span>{progressPct}% complete</span>
                <span>
                  {sessionAnsweredCount(session)} of {session.questionCount} answered
                </span>
              </div>
              <div
                className="dashboard-resume-card__progress-track"
                role="progressbar"
                aria-valuenow={progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="dashboard-resume-card__progress-fill"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <div className="dashboard-resume-card__actions">
              <Link to={resumeUrl} className="btn primary dashboard-resume-card__primary">
                {resumePrimaryLabel(session, packTitle)}
              </Link>
              <Link to={weakUrl} className="btn dashboard-resume-card__secondary">
                Practice weak chapters
              </Link>
            </div>
          </div>
        ) : (
          <div className="dashboard-resume-card dashboard-resume-card--empty">
            <div className="dashboard-resume-card__head">
              <span className="material-symbols-outlined dashboard-resume-card__icon">hourglass_empty</span>
              <div>
                <p className="dashboard-resume-card__eyebrow">Practice</p>
                <h2 className="dashboard-resume-card__title">No active session yet</h2>
              </div>
            </div>
            <p className="dashboard-resume-card__empty-text">
              Start an adaptive NEET session — we&apos;ll save your progress so you can resume anytime.
            </p>
            <div className="dashboard-resume-card__actions">
              <Link to="/practice" className="btn primary dashboard-resume-card__primary">
                Start practice →
              </Link>
              <Link to="/practice?exam=NEET#question-bank" className="btn dashboard-resume-card__secondary">
                Explore question bank
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="dashboard-hero__visual dashboard-hero__visual--hero-resume">
        <div className="dashboard-hero__image-wrap">
          <img alt="" className="dashboard-hero__image" src={STITCH_ANALYTICS_HERO} />
          <div className="dashboard-hero__image-fade" aria-hidden />
        </div>
      </div>
    </section>
  );
}
