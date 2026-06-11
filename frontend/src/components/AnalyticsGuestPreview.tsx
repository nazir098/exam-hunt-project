import { Link } from "react-router-dom";
import InsightChartsPanel from "./InsightChartsPanel";
import WeeklyActivityPanel from "./WeeklyActivityPanel";
import {
  ANALYTICS_FEATURE_CARDS,
  DEMO_ACCURACY,
  DEMO_ATTEMPTS,
  DEMO_BAR_HEIGHTS,
  DEMO_CORRECT,
  DEMO_HEATMAP,
  DEMO_SESSIONS,
  DEMO_STATS,
  DEMO_SUBJECTS,
  DEMO_TOTAL_MARKS,
  LOCKED_WIDGETS,
} from "../utils/analyticsPreview";
import { sessionAccuracy } from "../utils/dashboardStats";

function SampleBadge() {
  return <span className="analytics-preview-badge">Sample preview</span>;
}

function LockedWidget({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="analytics-preview-locked glass-card">
      <div className="analytics-preview-locked__blur" aria-hidden>
        <div className="analytics-preview-locked__ghost">
          <span className="material-symbols-outlined">{icon}</span>
          <span className="analytics-preview-locked__ghost-bar" />
          <span className="analytics-preview-locked__ghost-bar analytics-preview-locked__ghost-bar--short" />
        </div>
      </div>
      <div className="analytics-preview-locked__overlay">
        <span className="material-symbols-outlined">lock</span>
        <strong>{title}</strong>
        <p>{desc}</p>
      </div>
    </div>
  );
}

function DemoSessionsTable() {
  return (
    <section className="analytics-card glass-card analytics-preview-sessions">
      <header className="analytics-card-head spread">
        <div>
          <h2>Recent sessions</h2>
          <p className="analytics-card-sub">Sample practice runs — yours will appear here after sign-in.</p>
        </div>
        <SampleBadge />
      </header>
      <ul className="session-history">
        {DEMO_SESSIONS.map((s) => (
          <li key={s.id}>
            <div className="session-history__row session-history__row--static">
              <div className="session-history__main">
                <strong>{s.packId.replace("NEET_", "NEET ")}</strong>
                <span className="session-history__meta">
                  {s.status} · {s.correctCount + s.wrongCount}/{s.questionCount} answered
                </span>
              </div>
              <div className="session-history__scores">
                <span className="session-history__marks">
                  {s.totalMarks}/{s.maxMarks} marks
                </span>
                <span className="session-history__acc">{sessionAccuracy(s)}%</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SubjectPerformanceCards() {
  return (
    <section className="analytics-preview-subjects" aria-label="Subject performance preview">
      <div className="analytics-section-head">
        <h2 className="analytics-preview-section-title">Subject performance</h2>
        <SampleBadge />
      </div>
      <div className="analytics-preview-subject-grid">
        {DEMO_SUBJECTS.map((s) => (
          <article
            key={s.name}
            className={`analytics-preview-subject-card analytics-preview-subject-card--${s.tone}`}
          >
            <div className="analytics-preview-subject-card__top">
              <span className="analytics-preview-subject-card__name">{s.name}</span>
              <span className="analytics-preview-subject-card__trend">{s.trend}</span>
            </div>
            <p className="analytics-preview-subject-card__pct">{s.pct}%</p>
            <div className="analytics-subject-track">
              <div className="analytics-subject-fill" style={{ width: `${s.pct}%` }} />
            </div>
            <p className="analytics-preview-subject-card__hint">
              {s.tone === "focus"
                ? "Recommended drill this week"
                : "Strongest accuracy band"}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function AnalyticsGuestPreview() {
  return (
    <main className="analytics-page analytics-page--preview pt-4 lg:pt-8 space-y-lg lg:space-y-xl">
      <section className="analytics-preview-hero glass-card">
        <div className="analytics-preview-hero__copy">
          <span className="dashboard-badge analytics-preview-hero__badge">Progress lab · Preview</span>
          <h1 className="analytics-page-title">Your NEET progress, visualized</h1>
          <p className="analytics-preview-hero__lead">
            Accuracy curves, study heatmaps, session history, and AI weak-area hints — built from your
            real practice submits, not guesswork.
          </p>
          <div className="analytics-preview-hero__ctas">
            <Link to="/register?next=/analytics" className="btn primary electric-glow-bg">
              Create free account
            </Link>
            <Link to="/login?next=/analytics" className="btn">
              Sign in
            </Link>
          </div>
          <p className="analytics-preview-hero__fine">
            +4/−1 scoring · 20-question adaptive sessions · syncs after every answer
          </p>
        </div>
        <div className="analytics-preview-hero__stats" aria-hidden>
          <div className="analytics-preview-hero-stat">
            <span className="analytics-preview-hero-stat__value">{DEMO_ACCURACY}%</span>
            <span className="analytics-preview-hero-stat__label">accuracy</span>
          </div>
          <div className="analytics-preview-hero-stat">
            <span className="analytics-preview-hero-stat__value">{DEMO_ATTEMPTS}</span>
            <span className="analytics-preview-hero-stat__label">answered</span>
          </div>
          <div className="analytics-preview-hero-stat">
            <span className="analytics-preview-hero-stat__value">{DEMO_TOTAL_MARKS}</span>
            <span className="analytics-preview-hero-stat__label">marks</span>
          </div>
        </div>
      </section>

      <section className="scorecard glass-card analytics-preview-scorecard" aria-label="Sample scorecard">
        <div className="analytics-preview-scorecard__head">
          <h2 className="scorecard__title">At a glance</h2>
          <SampleBadge />
        </div>
        <div className="scorecard__grid">
          <div className="scorecard__stat">
            <span className="scorecard__stat-value scorecard__stat-value--primary">{DEMO_TOTAL_MARKS}</span>
            <span className="scorecard__stat-label">total marks</span>
          </div>
          <div className="scorecard__stat">
            <span className="scorecard__stat-value scorecard__stat-value--secondary">{DEMO_ACCURACY}%</span>
            <span className="scorecard__stat-label">accuracy</span>
          </div>
          <div className="scorecard__stat">
            <span className="scorecard__stat-value">{DEMO_ATTEMPTS}</span>
            <span className="scorecard__stat-label">answered</span>
          </div>
          <div className="scorecard__stat">
            <span className="scorecard__stat-value">{DEMO_CORRECT}</span>
            <span className="scorecard__stat-label">correct</span>
          </div>
        </div>
      </section>

      <div className="analytics-grid">
        <div className="analytics-main">
          <div className="analytics-preview-panel-wrap">
            <InsightChartsPanel
              stats={DEMO_STATS}
              progress={null}
              accuracy={DEMO_ACCURACY}
              attempts={DEMO_ATTEMPTS}
              subjects={DEMO_SUBJECTS.map((s) => ({ name: s.name, pct: s.pct }))}
              barHeights={DEMO_BAR_HEIGHTS}
            />
            <SampleBadge />
          </div>

          <section className="analytics-card glass-card analytics-preview-ai">
            <header className="analytics-card-head">
              <div className="analytics-card-icon">
                <span className="material-symbols-outlined">auto_awesome</span>
              </div>
              <div>
                <h2>AI-powered insights</h2>
                <p className="analytics-card-sub">Preview of personalized coaching copy from your attempts.</p>
              </div>
            </header>
            <div className="analytics-preview-ai__cards">
              <div className="analytics-preview-ai__insight">
                <span className="material-symbols-outlined">target</span>
                <div>
                  <strong>Priority: Inorganic Chemistry</strong>
                  <p>
                    Accuracy dipped 14% vs Biology last week. Drill 20 PYQs from the bank filtered to
                    this chapter.
                  </p>
                </div>
              </div>
              <div className="analytics-preview-ai__insight">
                <span className="material-symbols-outlined">trending_up</span>
                <div>
                  <strong>Momentum: Physics kinematics</strong>
                  <p>+12% over your last 3 sessions — keep adaptive practice on NEET 2024 pack.</p>
                </div>
              </div>
            </div>
            <p className="analytics-preview-ai__lock muted">
              <span className="material-symbols-outlined">lock</span>
              Live insights unlock when you sign in and complete practice sessions.
            </p>
          </section>

          <SubjectPerformanceCards />
          <DemoSessionsTable />

          <section className="analytics-preview-features" aria-label="Analytics benefits">
            <h2 className="analytics-preview-section-title">Why students use Analytics</h2>
            <div className="analytics-preview-features-grid">
              {ANALYTICS_FEATURE_CARDS.map((f) => (
                <article key={f.title} className="analytics-preview-feature-card glass-card">
                  <span className="material-symbols-outlined analytics-preview-feature-card__icon">
                    {f.icon}
                  </span>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="analytics-side space-y-lg">
          <div className="analytics-preview-panel-wrap">
            <WeeklyActivityPanel dailyCounts={DEMO_HEATMAP} totalQuestions={DEMO_ATTEMPTS} />
            <SampleBadge />
          </div>

          {LOCKED_WIDGETS.map((w) => (
            <LockedWidget key={w.title} icon={w.icon} title={w.title} desc={w.desc} />
          ))}
        </aside>
      </div>

      <section className="analytics-preview-cta-banner glass-card">
        <div>
          <h2 className="analytics-preview-cta-banner__title">Make this dashboard yours</h2>
          <p className="analytics-preview-cta-banner__sub">
            Free account · real marks from Practice · no credit card for the core loop
          </p>
        </div>
        <div className="analytics-preview-cta-banner__actions">
          <Link to="/register?next=/analytics" className="btn primary">
            Get started free
          </Link>
          <Link to="/practice" className="btn">
            Try practice first
          </Link>
        </div>
      </section>
    </main>
  );
}
