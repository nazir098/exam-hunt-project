import { useState } from "react";
import { Link } from "react-router-dom";
import type { PackSummary, PracticeSessionView } from "../api";
import { sessionResultRoute } from "../navigation/modes";
import { sessionAccuracy } from "../utils/dashboardStats";
import {
  formatSessionDuration,
  formatTestSessionDateModern,
  formatTestSessionScope,
  sessionAnsweredCount,
  sessionResumeUrl,
} from "../utils/practiceHub";

type Props = {
  recentTests?: PracticeSessionView[];
  packs?: PackSummary[];
};

const TEST_STEPS = [
  {
    icon: "timer",
    title: "Timed simulation",
    detail: "No instant feedback while the test is active.",
  },
  {
    icon: "lock",
    title: "Score unlocks on submit",
    detail: "Correctness, solutions, and AI help appear after you finish.",
  },
  {
    icon: "insights",
    title: "Feeds analytics",
    detail: "Weak areas update from this test — not the leaderboard.",
  },
] as const;

const RECENT_VISIBLE = 2;

function TestRecentCard({
  session,
  packs,
}: {
  session: PracticeSessionView;
  packs: PackSummary[];
}) {
  const completed = session.status === "completed";
  const acc = sessionAccuracy(session);
  const { dateLabel, timeLabel } = formatTestSessionDateModern(session);
  const duration = formatSessionDuration(session);
  const resumeUrl = sessionResumeUrl(session);
  const resultUrl = sessionResultRoute("test", session.id);

  return (
    <li className="test-summary__recent-item">
      <Link
        to={completed ? resultUrl : resumeUrl ?? resultUrl}
        className="test-summary__recent-card"
      >
        <div className="test-summary__recent-top">
          {completed ? (
            <>
              <span className="test-summary__recent-marks">
                {session.totalMarks}
                <span className="test-summary__recent-marks-max">/{session.maxMarks}</span>
              </span>
              <span className="test-summary__recent-acc">{acc}%</span>
            </>
          ) : (
            <>
              <span className="test-summary__recent-progress">
                {sessionAnsweredCount(session)}/{session.questionCount} answered
              </span>
              <span className="test-summary__recent-badge">In progress</span>
            </>
          )}
        </div>

        <p className="test-summary__recent-scope">{formatTestSessionScope(session, packs)}</p>

        <div className="test-summary__recent-meta">
          <span className="test-summary__recent-chip">
            <span className="material-symbols-outlined">calendar_today</span>
            {dateLabel}
            {timeLabel && <span className="test-summary__recent-chip-sub">{timeLabel}</span>}
          </span>
          <span className="test-summary__recent-chip">
            <span className="material-symbols-outlined">schedule</span>
            {duration ?? "—"}
          </span>
          <span className="test-summary__recent-chip">
            <span className="material-symbols-outlined">quiz</span>
            {session.questionCount} Q
          </span>
        </div>

        {completed && (
          <div className="test-summary__recent-breakdown">
            <span className="test-summary__recent-stat test-summary__recent-stat--ok">
              {session.correctCount} correct
            </span>
            <span className="test-summary__recent-stat test-summary__recent-stat--bad">
              {session.wrongCount} wrong
            </span>
            {(session.skipCount ?? 0) > 0 && (
              <span className="test-summary__recent-stat test-summary__recent-stat--skip">
                {session.skipCount} skipped
              </span>
            )}
          </div>
        )}
      </Link>
    </li>
  );
}

export default function TestSessionSummary({ recentTests = [], packs = [] }: Props) {
  const [sectionOpen, setSectionOpen] = useState(true);
  const [listExpanded, setListExpanded] = useState(false);

  const hiddenCount = Math.max(0, recentTests.length - RECENT_VISIBLE);
  const visibleTests = listExpanded ? recentTests : recentTests.slice(0, RECENT_VISIBLE);

  return (
    <aside className="test-summary glass-card" aria-label="Test expectations">
      <div className="test-summary__inner">
        <header className="test-summary__head">
          <p className="test-summary__eyebrow">
            <span className="material-symbols-outlined">fact_check</span>
            What to expect
          </p>
          <span className="test-summary__badge">Exam simulation</span>
        </header>

        <section
          className={`test-summary__recent${sectionOpen ? " is-open" : ""}`}
          aria-label="Recent tests"
        >
          <button
            type="button"
            className="test-summary__recent-toggle"
            aria-expanded={sectionOpen}
            aria-controls="test-summary-recent-panel"
            onClick={() => setSectionOpen((o) => !o)}
          >
            <span className="test-summary__recent-toggle-main">
              <h3 className="test-summary__section-label">Recent tests</h3>
              {recentTests.length > 0 && (
                <span className="test-summary__recent-count">{recentTests.length}</span>
              )}
            </span>
            <span className="material-symbols-outlined test-summary__recent-chevron" aria-hidden>
              expand_more
            </span>
          </button>

          <div
            id="test-summary-recent-panel"
            className="test-summary__recent-panel"
            hidden={!sectionOpen}
          >
            {recentTests.length === 0 ? (
              <p className="test-summary__recent-empty">
                No tests yet — your scores and timings appear here after you finish a run.
              </p>
            ) : (
              <>
                <ul className="test-summary__recent-list">
                  {visibleTests.map((session) => (
                    <TestRecentCard key={session.id} session={session} packs={packs} />
                  ))}
                </ul>
                {hiddenCount > 0 && (
                  <button
                    type="button"
                    className="test-summary__recent-more"
                    onClick={() => setListExpanded((e) => !e)}
                  >
                    {listExpanded ? "Show less" : `Show ${hiddenCount} more`}
                    <span className="material-symbols-outlined">
                      {listExpanded ? "expand_less" : "expand_more"}
                    </span>
                  </button>
                )}
              </>
            )}
          </div>
        </section>

        <section className="test-summary__section" aria-labelledby="test-summary-during">
          <h3 id="test-summary-during" className="test-summary__section-label">
            During the test
          </h3>
          <ol className="test-summary__steps">
            {TEST_STEPS.map((step, i) => (
              <li key={step.title} className="test-summary__step">
                <span className="test-summary__step-num">{i + 1}</span>
                <span className="test-summary__step-icon material-symbols-outlined">{step.icon}</span>
                <div className="test-summary__step-body">
                  <strong>{step.title}</strong>
                  <p>{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <footer className="test-summary__scoring">
          <span className="test-summary__section-label">Scoring</span>
          <div className="test-summary__score-row">
            <div className="test-summary__score-block test-summary__score-block--plus">
              <span className="test-summary__score-value">+4</span>
              <span className="test-summary__score-label">Correct</span>
            </div>
            <div className="test-summary__score-block test-summary__score-block--minus">
              <span className="test-summary__score-value">−1</span>
              <span className="test-summary__score-label">Wrong</span>
            </div>
          </div>
          <p className="test-summary__score-note">Skipped questions score zero · no negative marking</p>
        </footer>
      </div>
    </aside>
  );
}
