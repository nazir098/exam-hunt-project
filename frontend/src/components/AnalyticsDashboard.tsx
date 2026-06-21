import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchWrongAttempts, type ProgressSummary } from "../api";
import WeeklyActivityPanel from "./WeeklyActivityPanel";
import { useAuth } from "../auth/AuthContext";
import type { DashboardStats } from "../utils/dashboardStats";
import {
  accuracyTrendPoints,
  buildFourSubjectGauges,
  mistakeSegments,
  overallAccuracy,
  potentialAccuracy,
  questionsInLast28Days,
  questionsTrendPoints,
  trendDelta,
  trendDeltaLabel,
  type TrendPoint,
} from "../utils/analyticsDashboard";
import { buildAnalyticsInsights } from "../utils/analyticsInsights";
import { DEMO_MISTAKE_SEGMENTS, DEMO_MISTAKE_TOTAL } from "../utils/analyticsPreview";
import { primaryWeakChapter, weakChapterPracticeUrl } from "../utils/weakChapters";

type Props = {
  progress: ProgressSummary | null;
  stats: DashboardStats;
  defaultPackId?: string;
  guest?: boolean;
};

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "performance", label: "Performance" },
  { id: "subjects", label: "Subjects" },
  { id: "chapters", label: "Chapters" },
  { id: "weak", label: "Weak Areas" },
  { id: "mistakes", label: "Mistakes" },
  { id: "tests", label: "Tests" },
] as const;

function MiniLineChart({ points }: { points: TrendPoint[] }) {
  const w = 200;
  const h = 72;
  const max = Math.max(100, ...points.map((p) => p.value), 1);
  const min = Math.min(...points.map((p) => p.value), 0);
  const range = Math.max(max - min, 1);
  const coords = points.map((p, i) => {
    const x = (i / Math.max(points.length - 1, 1)) * (w - 16) + 8;
    const y = h - 8 - ((p.value - min) / range) * (h - 16);
    return `${x},${y}`;
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="analytics-v2-chart" aria-hidden>
      <polyline points={coords.join(" ")} fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" />
      {points.map((p, i) => {
        const x = (i / Math.max(points.length - 1, 1)) * (w - 16) + 8;
        const y = h - 8 - ((p.value - min) / range) * (h - 16);
        return <circle key={p.label} cx={x} cy={y} r="4" fill="#c4b5fd" />;
      })}
    </svg>
  );
}

function MiniBarChart({ points }: { points: TrendPoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <div className="analytics-v2-bars" aria-hidden>
      {points.map((p) => (
        <div key={p.label} className="analytics-v2-bars__col">
          <div className="analytics-v2-bars__fill" style={{ height: `${(p.value / max) * 100}%` }} />
        </div>
      ))}
    </div>
  );
}

function SubjectGauge({ name, icon, pct, correct, attempts }: ReturnType<typeof buildFourSubjectGauges>[0]) {
  const deg = Math.round((pct / 100) * 180);
  return (
    <article className="analytics-v2-subject-card glass-card">
      <div className="analytics-v2-subject-card__head">
        <span className="material-symbols-outlined">{icon}</span>
        <span>{name}</span>
      </div>
      <div
        className="analytics-v2-gauge"
        style={{ background: `conic-gradient(#8b5cf6 ${deg}deg, rgba(255,255,255,0.08) ${deg}deg 180deg)` }}
      >
        <span className="analytics-v2-gauge__value">{attempts > 0 ? `${pct}%` : "—"}</span>
      </div>
      <footer className="analytics-v2-subject-card__foot">
        <span>Correct {correct}/{attempts || "—"}</span>
        <span className="analytics-v2-subject-alltime">All time</span>
      </footer>
    </article>
  );
}

function MistakesDonut({ segments, total }: { segments: ReturnType<typeof mistakeSegments>; total: number }) {
  let acc = 0;
  const active = segments.filter((s) => s.count > 0);
  const gradient = active
    .map((s) => {
      const start = acc;
      acc += s.pct;
      return `${s.color} ${start}% ${acc}%`;
    })
    .join(", ");

  return (
    <div className="analytics-v2-donut-wrap">
      <div
        className="analytics-v2-donut"
        style={{ background: total > 0 ? `conic-gradient(from -90deg, ${gradient})` : "rgba(255,255,255,0.06)" }}
        role="img"
        aria-label={`${total} total mistakes`}
      >
        <div className="analytics-v2-donut__hole">
          <strong className="analytics-v2-donut__total">{total}</strong>
          <span className="analytics-v2-donut__total-label">Total mistakes</span>
        </div>
      </div>
      <ul className="analytics-v2-donut-legend">
        {segments.map((s) => (
          <li key={s.label}>
            <span className="analytics-v2-donut-legend__label">
              <span className="analytics-v2-donut-legend__dot" style={{ background: s.color }} aria-hidden />
              <span className="analytics-v2-donut-legend__name">{s.label}</span>
            </span>
            <span className="analytics-v2-donut-legend__pct">{s.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AnalyticsDashboard({ progress, stats, defaultPackId, guest = false }: Props) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [wrongCount, setWrongCount] = useState(guest ? DEMO_MISTAKE_TOTAL : 0);
  const [mistakeSegs, setMistakeSegs] = useState(guest ? DEMO_MISTAKE_SEGMENTS : mistakeSegments([]));

  const weak = primaryWeakChapter(progress?.weakChapters);
  const accuracy = overallAccuracy(progress);
  const attempts = progress?.totalAttempts ?? 0;
  const accPoints = useMemo(
    () => accuracyTrendPoints(stats.sessions, accuracy),
    [stats.sessions, accuracy]
  );
  const qPoints = useMemo(
    () => questionsTrendPoints(progress?.weeklyActivity, stats.sessions),
    [progress?.weeklyActivity, stats.sessions]
  );
  const accDelta = trendDelta(accPoints.map((p) => p.value));
  const qDelta = trendDelta(qPoints.map((p) => p.value));
  const currentWeekAccuracy = accPoints[accPoints.length - 1]?.value ?? accuracy;
  const questionsLast28 = questionsInLast28Days(progress?.weeklyActivity, stats.sessions);
  const subjects = useMemo(() => buildFourSubjectGauges(progress?.weakChapters), [progress?.weakChapters]);
  const insights = useMemo(() => buildAnalyticsInsights(progress, stats), [progress, stats]);
  const practiceUrl = weak ? weakChapterPracticeUrl(weak, defaultPackId) : "/practice";
  const potential = potentialAccuracy(weak?.accuracyPercent ?? accuracy, accDelta);
  const registerUrl = "/register?next=%2Fanalytics";
  const loginUrl = "/login?next=%2Fanalytics";

  useEffect(() => {
    if (guest) return;
    fetchWrongAttempts()
      .then((rows) => {
        setWrongCount(rows.length);
        setMistakeSegs(mistakeSegments(rows));
      })
      .catch(() => {
        setWrongCount(0);
        setMistakeSegs(mistakeSegments([]));
      });
  }, [guest]);

  function scrollTo(id: string) {
    setActiveTab(id);
    document.getElementById(`analytics-section-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const firstName = user?.displayName?.split(" ")[0] ?? "there";

  return (
    <div className="analytics-v2">
      {guest && (
        <div className="analytics-v2-guest-banner glass-card">
          <div className="analytics-v2-guest-banner__text">
            <span className="analytics-v2-guest-banner__pill">Preview</span>
            <p>Sample analytics below. Sign in to track your real progress and mistakes.</p>
          </div>
          <div className="analytics-v2-guest-banner__actions">
            <Link to={registerUrl} className="btn primary btn-sm">
              Get started
            </Link>
            <Link to={loginUrl} className="btn btn-sm">
              Sign in
            </Link>
          </div>
        </div>
      )}

      <header className="analytics-v2-header">
        <h1 className="analytics-v2-title">Analytics</h1>
        <nav className="analytics-v2-tabs" aria-label="Analytics sections">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`analytics-v2-tabs__btn${activeTab === tab.id ? " analytics-v2-tabs__btn--active" : ""}`}
              onClick={() => scrollTo(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <section id="analytics-section-overview" className="analytics-v2-focus glass-card">
        <div className="analytics-v2-focus__main">
          <p className="analytics-v2-eyebrow">Your focus area</p>
          <div className="analytics-v2-focus__title-row">
            <h2>{weak?.chapter ?? "Start practicing"}</h2>
            {weak && <span className="analytics-v2-badge analytics-v2-badge--weak">Weakest chapter</span>}
          </div>
          <p className="analytics-v2-focus__desc">
            {weak
              ? "You are struggling with this chapter. Focus more to improve your accuracy."
              : "Complete practice sessions to unlock your weakest chapter and personalized focus."}
          </p>
          <dl className="analytics-v2-focus__stats">
            <div>
              <dt>Current accuracy</dt>
              <dd>{weak ? `${weak.accuracyPercent}%` : `${accuracy}%`}</dd>
            </div>
            <div>
              <dt>Potential accuracy</dt>
              <dd>{potential}%</dd>
            </div>
            <div>
              <dt>Questions attempted</dt>
              <dd>{weak?.attempts ?? attempts}</dd>
            </div>
          </dl>
        </div>
        <aside className="analytics-v2-focus__action">
          <p className="analytics-v2-focus__rec">
            {weak ? "Practice 10–15 questions daily from this chapter." : "Start with 10 questions to build your baseline."}
          </p>
          <Link to={guest ? registerUrl : practiceUrl} className="btn primary analytics-v2-focus__cta">
            {guest ? "Sign in to practice" : "Practice now"}
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
          <span className="analytics-v2-focus__icon material-symbols-outlined" aria-hidden>
            track_changes
          </span>
        </aside>
      </section>

      <section id="analytics-section-performance" className="analytics-v2-section">
        <div className="analytics-v2-section__head">
          <h2>Performance trends</h2>
          <span className="analytics-v2-pill">Last 4 weeks</span>
        </div>
        <div className="analytics-v2-trends">
          <article className="analytics-v2-trend-card glass-card">
            <header>
              <span>Accuracy trend</span>
              <strong>{currentWeekAccuracy}%</strong>
              <span className={accDelta >= 0 ? "analytics-v2-trend-up" : "analytics-v2-trend-down"}>
                {trendDeltaLabel(accDelta, "percent")}
              </span>
            </header>
            <MiniLineChart points={accPoints} />
            <footer className="analytics-v2-trend-labels">
              {accPoints.map((p) => (
                <span key={p.label}>{p.label}</span>
              ))}
            </footer>
          </article>

          <article className="analytics-v2-trend-card glass-card">
            <header>
              <span>Questions solved</span>
              <strong>{questionsLast28}</strong>
              <span className={qDelta >= 0 ? "analytics-v2-trend-up" : "analytics-v2-trend-down"}>
                {trendDeltaLabel(qDelta, "count")}
              </span>
            </header>
            <MiniBarChart points={qPoints} />
            <footer className="analytics-v2-trend-labels">
              {qPoints.map((p) => (
                <span key={p.label}>{p.label}</span>
              ))}
            </footer>
          </article>

          <div className="analytics-v2-trend-card glass-card analytics-v2-trend-card--heatmap">
            <header>
              <span>Daily activity</span>
            </header>
            <WeeklyActivityPanel
              embedded
              dailyCounts={progress?.weeklyActivity}
              sessions={stats.sessions}
              totalQuestions={questionsLast28}
            />
          </div>
        </div>
      </section>

      <section id="analytics-section-subjects" className="analytics-v2-section">
        <div className="analytics-v2-section__head">
          <h2>Subject performance</h2>
          <span className="analytics-v2-pill">All time</span>
        </div>
        <div className="analytics-v2-subjects">
          {subjects.map((s) => (
            <SubjectGauge key={s.name} {...s} />
          ))}
        </div>
      </section>

      <div className="analytics-v2-split">
        <section id="analytics-section-chapters" className="analytics-v2-section analytics-v2-section--table glass-card">
          <div className="analytics-v2-section__head">
            <h2>Weakest chapters</h2>
            <Link to="/practice" className="analytics-v2-link">
              View all chapters →
            </Link>
          </div>
          <div className="analytics-v2-table-wrap">
            <table className="analytics-v2-table">
              <thead>
                <tr>
                  <th>Chapter</th>
                  <th>Subject</th>
                  <th>Accuracy</th>
                  <th>Attempted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {(progress?.weakChapters ?? []).slice(0, 6).map((c) => (
                  <tr key={`${c.subject}-${c.chapter}`}>
                    <td>{c.chapter}</td>
                    <td>{c.subject}</td>
                    <td>
                      <div className="analytics-v2-acc-bar">
                        <span style={{ width: `${c.accuracyPercent}%` }} />
                        <em>{c.accuracyPercent}%</em>
                      </div>
                    </td>
                    <td>{c.attempts}</td>
                    <td>
                      <Link
                        to={guest ? registerUrl : weakChapterPracticeUrl(c, defaultPackId)}
                        className="analytics-v2-table__action"
                      >
                        Practice →
                      </Link>
                    </td>
                  </tr>
                ))}
                {(progress?.weakChapters ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="analytics-v2-empty">
                      Practice more to populate weak chapters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section id="analytics-section-mistakes" className="analytics-v2-section glass-card analytics-v2-mistakes">
          <h2>Mistakes overview</h2>
          <MistakesDonut segments={mistakeSegs} total={wrongCount} />
          <Link to={guest ? loginUrl : "/review/wrong-attempts"} className="btn primary analytics-v2-mistakes__cta">
            {guest ? "Sign in to review mistakes →" : "Review mistakes →"}
          </Link>
        </section>
      </div>

      <section id="analytics-section-weak" className="analytics-v2-section">
        <h2 className="analytics-v2-section__title-only">AI insights</h2>
        <div className="analytics-v2-insights">
          <article className="analytics-v2-insight glass-card analytics-v2-insight--red">
            <span className="material-symbols-outlined">error</span>
            <h3>Most common mistake</h3>
            <p>{insights[0] ?? "Keep practicing to surface patterns."}</p>
          </article>
          <article className="analytics-v2-insight glass-card analytics-v2-insight--orange">
            <span className="material-symbols-outlined">lightbulb</span>
            <h3>Frequently missed concept</h3>
            <p>
              {weak
                ? `Path difference & phase difference in ${weak.chapter}`
                : "Complete sessions to unlock concept-level insights."}
            </p>
          </article>
          <article className="analytics-v2-insight glass-card analytics-v2-insight--green">
            <span className="material-symbols-outlined">recommend</span>
            <h3>Recommended for you</h3>
            <p>Revise theory first, then solve 10 PYQs from your weakest chapter.</p>
          </article>
          <article className="analytics-v2-insight glass-card analytics-v2-insight--purple">
            <span className="material-symbols-outlined">trending_up</span>
            <h3>Your improvement potential</h3>
            <p className="analytics-v2-insight__big">↑ {potential - (weak?.accuracyPercent ?? accuracy)}%</p>
          </article>
        </div>
      </section>

      <section id="analytics-section-tests" className="analytics-v2-banner glass-card">
        <div className="analytics-v2-banner__text">
          <span className="material-symbols-outlined">lightbulb</span>
          <p>
            {guest
              ? "Create a free account to save sessions, track weak chapters, and unlock personalized AI insights."
              : `Consistent practice + focused revision = better results. You're improving! Keep going, ${firstName}.`}
          </p>
        </div>
        <Link to={guest ? registerUrl : "/practice"} className="btn primary analytics-v2-banner__cta">
          {guest ? "Get started free →" : "Go to practice →"}
        </Link>
      </section>
    </div>
  );
}
