import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AnalyticsGuestPreview from "../components/AnalyticsGuestPreview";
import AnalyticsFocusCard from "../components/AnalyticsFocusCard";
import AnalyticsRecommendedCard from "../components/AnalyticsRecommendedCard";
import AnalyticsSessionsSection from "../components/AnalyticsSessionsSection";
import AnalyticsWeakSubjectGrid from "../components/AnalyticsWeakSubjectGrid";
import { useAuth } from "../auth/AuthContext";
import InsightChartsPanel from "../components/InsightChartsPanel";
import WeeklyActivityPanel from "../components/WeeklyActivityPanel";
import PracticeAiPanel from "../components/PracticeAiPanel";
import { fetchPacks, type PackSummary } from "../api";
import { buildDashboardStats, NEET_SUBJECT_MASTERY } from "../utils/dashboardStats";
import { bankDisplayPacks, buildRecommendedPractice } from "../utils/practiceHub";
import { primaryWeakChapter } from "../utils/weakChapters";

export default function AnalyticsPage() {
  const { user, progress, loading, refreshProgress } = useAuth();
  const [packs, setPacks] = useState<PackSummary[]>([]);

  useEffect(() => {
    if (user) refreshProgress();
  }, [user, refreshProgress]);

  useEffect(() => {
    fetchPacks()
      .then(setPacks)
      .catch(() => setPacks([]));
  }, []);

  const stats = useMemo(() => buildDashboardStats(progress), [progress]);
  const displayPacks = useMemo(() => bankDisplayPacks(packs), [packs]);
  const recommended = useMemo(
    () => buildRecommendedPractice(displayPacks, progress),
    [displayPacks, progress]
  );
  const defaultPackId = recommended?.packId ?? displayPacks[0]?.packId;
  const weak = primaryWeakChapter(progress?.weakChapters);

  const accuracy = progress?.accuracyPercent ?? null;
  const attempts = progress?.totalAttempts ?? 0;
  const barHeights = stats.bars.length ? stats.bars : [40, 55, 45, 60, 70, accuracy ?? 50];

  const subjects = useMemo(() => {
    if (!progress?.byPack?.length) return [...NEET_SUBJECT_MASTERY];
    const base = accuracy ?? 70;
    return [
      { name: "Physics", pct: Math.min(99, base + 8) },
      { name: "Chemistry", pct: Math.max(40, base - 6) },
      { name: "Biology", pct: Math.min(99, base + 2) },
    ];
  }, [progress, accuracy]);

  if (loading) {
    return (
      <main className="analytics-page pt-4 lg:pt-8">
        <p className="analytics-loading">Loading analytics…</p>
      </main>
    );
  }

  if (!user) {
    return <AnalyticsGuestPreview />;
  }

  return (
    <main className="analytics-page pt-4 lg:pt-8 space-y-lg lg:space-y-xl">
      <header className="analytics-page-header">
        <p className="page-eyebrow">Progress lab</p>
        <h1 className="analytics-page-title">Analytics</h1>
        <p className="analytics-page-desc">
          See what to fix, what to practice next, and whether you&apos;re improving.
          Practice + Test data feed weak areas; leaderboard uses Practice only.
        </p>
        <p className="analytics-page-links">
          <Link to="/review/wrong-attempts">Review wrong attempts →</Link>
        </p>
      </header>

      <AnalyticsFocusCard progress={progress} stats={stats} defaultPackId={defaultPackId} />

      <AnalyticsRecommendedCard recommended={recommended} weakChapter={weak} />

      <PracticeAiPanel
        featureIds={["weak_chapter_analysis", "practice_from_weak", "revision_notes", "mentor"]}
        title="AI practice coach"
        compact
        className="practice-ai-panel--analytics"
      />

      <AnalyticsWeakSubjectGrid progress={progress} defaultPackId={defaultPackId} />

      <AnalyticsSessionsSection stats={stats} />

      <div className="analytics-trends-grid">
        <InsightChartsPanel
          stats={stats}
          progress={progress}
          accuracy={accuracy}
          attempts={attempts}
          subjects={subjects}
          barHeights={barHeights}
        />
        <WeeklyActivityPanel
          dailyCounts={progress?.weeklyActivity}
          sessions={stats.sessions}
          totalQuestions={attempts}
        />
      </div>
    </main>
  );
}
