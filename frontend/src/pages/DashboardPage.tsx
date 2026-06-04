import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchLeaderboard } from "../api";
import { useAuth } from "../auth/AuthContext";
import CompactStatsStrip from "../components/CompactStatsStrip";
import { STITCH_ANALYTICS_HERO } from "../design/stitchAssets";
import { buildDashboardStats } from "../utils/dashboardStats";

const QUICK_ACTIONS = [
  {
    to: "/practice",
    icon: "bolt",
    title: "Practice",
    desc: "Marks tracked · NEET +4 / −1 · adaptive",
    primary: true,
  },
  {
    to: "/bank?exam=NEET",
    icon: "menu_book",
    title: "Question Bank",
    desc: "Browse PYQs with solutions",
    primary: false,
  },
  {
    to: "/analytics",
    icon: "insights",
    title: "Analytics",
    desc: "Trends, heatmap & session history",
    primary: false,
  },
  {
    to: "/leaderboard",
    icon: "emoji_events",
    title: "Leaderboard",
    desc: "See how you rank by Practice marks",
    primary: false,
  },
] as const;

const SUBJECT_SHORTCUTS = [
  { name: "Physics", icon: "architecture", to: "/bank?exam=NEET&subject=Physics" },
  { name: "Chemistry", icon: "experiment", to: "/bank?exam=NEET&subject=Chemistry" },
  { name: "Biology", icon: "biotech", to: "/bank?exam=NEET&subject=Biology" },
] as const;

export default function DashboardPage() {
  const { user, progress, refreshProgress } = useAuth();
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);

  useEffect(() => {
    if (user) refreshProgress();
  }, [user, refreshProgress]);

  useEffect(() => {
    if (!user) {
      setLeaderboardRank(null);
      return;
    }
    fetchLeaderboard(100, "all")
      .then((data) => setLeaderboardRank(data.you?.rank ?? null))
      .catch(() => setLeaderboardRank(null));
  }, [user?.id, progress?.totalAttempts]);

  const stats = useMemo(() => buildDashboardStats(progress), [progress]);

  const name = user?.displayName?.split(" ")[0] || "Scholar";
  const accuracy = progress?.accuracyPercent ?? null;
  const attempts = progress?.totalAttempts ?? 0;
  const streak = user ? Math.min(14, Math.max(1, attempts || 1)) : 14;
  const rankLabel =
    leaderboardRank != null ? `#${leaderboardRank}` : attempts > 0 ? "Unranked" : "—";
  const topTier = accuracy != null && accuracy >= 80;

  const practiceCta = stats.activeSession?.currentQuestionId
    ? `/practice/${stats.activeSession.id}/${stats.activeSession.currentQuestionId}`
    : "/practice";
  const practiceLabel = stats.activeSession ? "Resume NEET Practice" : "Start NEET Practice";

  return (
    <main className="dashboard-page pb-28 lg:pb-10 pt-4 lg:pt-8 space-y-lg lg:space-y-xl">
      <p className="page-eyebrow">Home</p>

      <section className="dashboard-hero glass-card">
        <div className="dashboard-hero__body">
          <span className="dashboard-badge">Your command center</span>
          <h1 className="dashboard-hero__title">
            Hello, {name}!{" "}
            {topTier ? (
              <>You&apos;re in the <span className="text-primary">top 5%</span> today.</>
            ) : (
              <>Ready to study?</>
            )}
          </h1>
          <p className="dashboard-hero__lead">
            Use Practice for tracked marks, Question Bank to study freely, or Analytics for trends.
          </p>
          <div className="dashboard-hero__pills">
            <div className="dashboard-pill">
              <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                local_fire_department
              </span>
              <span>{streak} Day Flame</span>
            </div>
            <Link to="/leaderboard" className="dashboard-pill dashboard-pill--link">
              <span className="material-symbols-outlined text-primary">emoji_events</span>
              <span>{user ? `Rank ${rankLabel} · Leaderboard` : "Leaderboard"}</span>
            </Link>
          </div>
        </div>

        <div className="dashboard-hero__visual">
          <div className="dashboard-hero__image-wrap">
            <img alt="" className="dashboard-hero__image" src={STITCH_ANALYTICS_HERO} />
            <div className="dashboard-hero__image-fade" aria-hidden />
          </div>
          <Link to={user ? practiceCta : "/login?next=/practice"} className="dashboard-hero__cta electric-glow-bg">
            {user ? practiceLabel : "Sign in to practice"}
          </Link>
        </div>
      </section>

      {stats.activeSession && (
        <Link
          to={practiceCta}
          className="dashboard-resume-banner glass-card"
        >
          <span className="material-symbols-outlined text-secondary">play_circle</span>
          <span>
            <strong>Session in progress</strong> — {stats.activeSession.packId.replace("NEET_", "NEET ")} · tap to
            resume
          </span>
          <span className="material-symbols-outlined">chevron_right</span>
        </Link>
      )}

      <section className="dashboard-quick-actions" aria-label="Quick actions">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className={`dashboard-action-card glass-card ${action.primary ? "dashboard-action-card--primary" : ""}`}
          >
            <span className="material-symbols-outlined dashboard-action-card__icon">{action.icon}</span>
            <strong>{action.title}</strong>
            <span className="dashboard-action-card__desc">{action.desc}</span>
          </Link>
        ))}
      </section>

      {user && progress && <CompactStatsStrip progress={progress} />}

      {user && attempts > 0 && (
        <Link to="/analytics" className="dashboard-teaser glass-card">
          <div className="dashboard-teaser__icon">
            <span className="material-symbols-outlined">trending_up</span>
          </div>
          <div className="dashboard-teaser__copy">
            <strong>Accuracy trend {stats.trend >= 0 ? "+" : ""}{stats.trend}%</strong>
            <span>Charts, weekly heatmap, and full session history live on Analytics.</span>
          </div>
          <span className="material-symbols-outlined dashboard-teaser__arrow">arrow_forward</span>
        </Link>
      )}

      <section className="dashboard-subjects">
        <div className="dashboard-subjects__head">
          <h2 className="dashboard-card__title">Study by subject</h2>
          <Link to="/bank?exam=NEET" className="text-primary text-label-md font-bold">
            All chapters →
          </Link>
        </div>
        <div className="dashboard-subjects__grid">
          {SUBJECT_SHORTCUTS.map((s) => (
            <Link key={s.name} to={s.to} className="dashboard-subject-card glass-card">
              <span className="material-symbols-outlined text-primary">{s.icon}</span>
              <span>{s.name}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
