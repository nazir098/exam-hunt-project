import { useEffect, useMemo, useState } from "react";
import AnalyticsDashboard from "../components/AnalyticsDashboard";
import { useAuth } from "../auth/AuthContext";
import { fetchPacks, type PackSummary } from "../api";
import { buildDashboardStats } from "../utils/dashboardStats";
import { DEMO_PROGRESS, DEMO_STATS } from "../utils/analyticsPreview";
import { bankDisplayPacks, buildRecommendedPractice } from "../utils/practiceHub";

export default function AnalyticsPage() {
  const { user, progress, loading } = useAuth();
  const [packs, setPacks] = useState<PackSummary[]>([]);

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

  if (loading) {
    return (
      <main className="analytics-page pt-4 lg:pt-8">
        <p className="analytics-loading">Loading analytics…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="analytics-page analytics-page--v2 pt-4 lg:pt-6 pb-8">
        <AnalyticsDashboard
          guest
          progress={DEMO_PROGRESS}
          stats={DEMO_STATS}
          defaultPackId={defaultPackId}
        />
      </main>
    );
  }

  return (
    <main className="analytics-page analytics-page--v2 pt-4 lg:pt-6 pb-8">
      <AnalyticsDashboard
        progress={progress}
        stats={stats}
        defaultPackId={defaultPackId}
      />
    </main>
  );
}
