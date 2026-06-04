import { useMemo } from "react";
import { Link } from "react-router-dom";
import { PracticeSessionView } from "../api";
import { useAuth } from "../auth/AuthContext";
import { STITCH_ANALYTICS_HERO } from "../design/stitchAssets";

function sessionAccuracy(s: PracticeSessionView): number {
  const total = s.correctCount + s.wrongCount;
  if (total === 0) return 0;
  return Math.round((s.correctCount / total) * 100);
}

function heatmapClass(level: number): string {
  if (level <= 0) return "bg-surface-container-highest";
  if (level === 1) return "bg-secondary/30";
  if (level === 2) return "bg-secondary/60";
  if (level === 3) return "bg-secondary";
  return "bg-secondary/80";
}

function buildHeatmap(sessions: PracticeSessionView[]): number[] {
  const cells = Array(21).fill(0);
  const now = new Date();
  sessions.forEach((s) => {
    const d = new Date(s.startedAt);
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays >= 0 && diffDays < 21) {
      const idx = 20 - diffDays;
      cells[idx] = Math.min(4, cells[idx] + 1);
    }
  });
  return cells;
}

export default function AnalyticsPage() {
  const { user, progress, loading } = useAuth();

  const stats = useMemo(() => {
    const sessions = progress?.recentSessions ?? [];
    const completed = sessions.filter((s) => s.correctCount + s.wrongCount > 0);
    const lastSix = completed.slice(0, 6).reverse();
    const bars = lastSix.map((s) => sessionAccuracy(s));
    const trend =
      bars.length >= 2 ? bars[bars.length - 1] - bars[0] : progress?.accuracyPercent ?? 12;
    const totalMarks = sessions.reduce((sum, s) => sum + s.totalMarks, 0);
    const maxMarks = sessions.reduce((sum, s) => sum + s.maxMarks, 0);
    return { sessions, bars, trend, heatmap: buildHeatmap(sessions), totalMarks, maxMarks, packs: progress?.byPack ?? [] };
  }, [progress]);

  const name = user?.displayName?.split(" ")[0] || "Scholar";
  const accuracy = progress?.accuracyPercent ?? null;
  const attempts = progress?.totalAttempts ?? 0;
  const barHeights = stats.bars.length ? stats.bars : [40, 55, 45, 60, 70, accuracy ?? 50];

  if (loading) {
    return (
      <main className="analytics-page px-margin-mobile pb-8">
        <p className="text-outline">Loading analytics…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="analytics-page px-margin-mobile pb-8">
        <section className="glass-card rounded-xl p-lg md:p-xl flex flex-col gap-lg">
          <h1 className="text-headline-lg font-headline-lg">Analytics &amp; insights</h1>
          <p className="text-on-surface-variant text-body-md max-w-xl">
            Sign in and complete practice sessions to unlock accuracy trends, activity heatmaps, and
            personalized recommendations.
          </p>
          <Link
            to="/login?next=/analytics"
            className="electric-glow-bg px-xl py-md rounded-lg text-on-primary-fixed font-bold w-fit"
          >
            Sign in to view analytics
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="analytics-page px-margin-mobile pb-8">
      <section className="mb-xxl relative overflow-hidden rounded-xl p-lg glass-card flex flex-col gap-lg">
        <div className="relative z-10 flex-1">
          <div className="flex items-center gap-xs mb-sm">
            <span className="px-3 py-1 rounded-full bg-secondary-container/20 text-secondary text-caption font-bold uppercase tracking-wider">
              Academic Excellence
            </span>
          </div>
          <h2 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg text-on-surface mb-sm leading-tight">
            Hello, {name}!{" "}
            {accuracy != null && accuracy >= 80
              ? "You're in the top 5% today."
              : "Keep building your mastery."}
          </h2>
          <p className="text-on-surface-variant text-body-md max-w-xl">
            {attempts > 0
              ? `Overall accuracy ${accuracy}% across ${attempts} attempts. Review trends below.`
              : "Complete your first practice session to populate charts and recommendations."}
          </p>
          <div className="mt-lg flex flex-wrap gap-md">
            <div className="flex items-center gap-sm bg-surface-container-highest/50 px-md py-sm rounded-xl border border-white/5">
              <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                local_fire_department
              </span>
              <span className="font-bold">{attempts} attempts</span>
            </div>
            <div className="flex items-center gap-sm bg-surface-container-highest/50 px-md py-sm rounded-xl border border-white/5">
              <span className="material-symbols-outlined text-primary">military_tech</span>
              <span className="font-bold">{stats.totalMarks} marks</span>
            </div>
          </div>
        </div>
        <div className="relative w-full aspect-video rounded-xl overflow-hidden group">
          <img
            alt=""
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            src={STITCH_ANALYTICS_HERO}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 text-center">
            <Link
              to="/practice"
              className="w-full py-3 electric-glow-bg rounded-lg text-on-primary-fixed font-bold shadow-lg shadow-primary-container/20 active:scale-95 transition-transform duration-150 block"
            >
              {stats.sessions.some((s) => s.status === "active" && s.currentQuestionId)
                ? "Resume Practice Session"
                : "Start Practice Session"}
            </Link>
          </div>
        </div>
      </section>

      <div className="space-y-lg">
        <div className="space-y-lg">
          <div className="glass-card p-lg rounded-xl relative overflow-hidden group">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all" />
            <div className="flex items-start gap-md mb-lg">
              <div className="p-3 rounded-xl bg-primary-container/20 text-primary">
                <span className="material-symbols-outlined text-headline-md">psychology</span>
              </div>
              <div>
                <h3 className="text-headline-md font-headline-md">AI Insights &amp; Trends</h3>
                <p className="text-on-surface-variant text-body-sm">Personalized corrective measures based on last 5 tests.</p>
              </div>
            </div>
            <div className="bg-surface-container-lowest/50 p-md rounded-xl border-l-4 border-error mb-lg">
              <p className="text-body-md">
                {attempts === 0 ? (
                  '"Start a practice session to receive personalized focus areas."'
                ) : (
                  <>
                    Focus on <span className="text-primary font-bold">weak chapters</span>: your accuracy is{" "}
                    <span className="text-error font-bold">{accuracy}%</span>.
                  </>
                )}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
              <div className="p-md rounded-xl bg-surface-container-high/40">
                <div className="flex justify-between items-end mb-sm">
                  <span className="text-label-md uppercase tracking-wider text-on-surface-variant">Accuracy Trend</span>
                  <span className="text-secondary font-bold text-headline-md">
                    {stats.trend >= 0 ? "+" : ""}
                    {stats.trend}%
                  </span>
                </div>
                <div className="h-16 flex items-end gap-1">
                  {barHeights.map((h, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-t ${
                        i >= barHeights.length - 2
                          ? i === barHeights.length - 1
                            ? "bg-secondary"
                            : "bg-primary"
                          : "bg-surface-container-highest"
                      }`}
                      style={{ height: `${Math.max(20, Math.min(100, h))}%` }}
                    />
                  ))}
                </div>
              </div>
              <div className="p-md rounded-xl bg-surface-container-high/40">
                <span className="text-label-md uppercase tracking-wider text-on-surface-variant block mb-sm">
                  Subject Mastery
                </span>
                <div className="space-y-3">
                  {stats.packs.length === 0 ? (
                    <p className="text-caption text-outline">No pack breakdown yet.</p>
                  ) : (
                    stats.packs.slice(0, 3).map((p, i) => {
                      const pct = p.attempts ? Math.round((p.correct / p.attempts) * 100) : 0;
                      const fill = i === 1 ? "bg-error" : i === 2 ? "bg-secondary" : "bg-primary";
                      return (
                        <div key={p.packId}>
                          <div className="flex justify-between text-caption mb-1">
                            <span>{p.packId.replace(/_/g, " ")}</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                            <div className={`h-full ${fill}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-lg rounded-xl">
            <div className="flex justify-between items-center mb-lg">
              <h3 className="text-headline-md font-headline-md">AI Picks: Recommended practice</h3>
              <span className="material-symbols-outlined text-primary">auto_awesome</span>
            </div>
            <div className="space-y-md">
              {stats.sessions.length === 0 ? (
                <p className="text-on-surface-variant text-caption">Complete practice to see session picks.</p>
              ) : (
                stats.sessions.slice(0, 2).map((s, i) => (
                  <Link
                    key={s.id}
                    to={s.currentQuestionId ? `/practice/${s.id}/${s.currentQuestionId}` : "/practice"}
                    className="flex items-center gap-md p-md rounded-xl bg-surface-container/50 border border-white/5 hover:border-primary/20 transition-all group cursor-pointer"
                  >
                    <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-surface-container-highest group-hover:bg-primary-container/20 group-hover:text-primary transition-colors">
                      <span className="material-symbols-outlined">{i === 0 ? "terminal" : "bolt"}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-body-md">
                        {s.exam} session · {s.correctCount}✓ {s.wrongCount}✗
                      </h4>
                      <p className="text-on-surface-variant text-caption">
                        {s.questionCount} questions · {sessionAccuracy(s)}% session accuracy
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">
                      chevron_right
                    </span>
                  </Link>
                ))
              )}
              <Link
                to="/bank?exam=NEET"
                className="flex items-center gap-md p-md rounded-xl bg-surface-container/50 border border-white/5 hover:border-primary/20 transition-all group cursor-pointer"
              >
                <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-surface-container-highest group-hover:bg-primary-container/20 group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined">menu_book</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-body-md">Browse NEET question bank</h4>
                  <p className="text-on-surface-variant text-caption">Study with published paper images</p>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">
                  chevron_right
                </span>
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-lg">
          <div className="glass-card p-lg rounded-xl">
            <h3 className="text-label-md uppercase tracking-widest text-on-surface-variant mb-md">Weekly Activity</h3>
            <div className="grid grid-cols-7 gap-1">
              {stats.heatmap.map((level, i) => (
                <div key={i} className={`heatmap-cell ${heatmapClass(level)}`} />
              ))}
            </div>
            <div className="flex justify-between mt-md text-[10px] text-on-surface-variant uppercase tracking-tighter">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
          </div>

          <div className="glass-card p-lg rounded-xl overflow-hidden relative">
            <div className="absolute -bottom-4 -right-4 text-primary/10 select-none">
              <span className="material-symbols-outlined text-[80px]">workspace_premium</span>
            </div>
            <h3 className="text-label-md uppercase tracking-widest text-on-surface-variant mb-md">Current Goal</h3>
            <div className="flex items-center gap-md">
              <div
                className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin-slow flex items-center justify-center p-1"
                style={{ animationDuration: "8s" }}
              >
                <div className="w-full h-full rounded-full bg-primary-container/20 flex items-center justify-center rotate-inverse">
                  <span className="material-symbols-outlined text-primary">trophy</span>
                </div>
              </div>
              <div>
                <p className="font-bold text-body-md">Practice milestone</p>
                <p className="text-caption text-on-surface-variant">
                  {stats.maxMarks > 0
                    ? `${stats.totalMarks} / ${stats.maxMarks} marks from sessions`
                    : "Earn marks in adaptive practice"}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-sm">
            <Link
              to="/bank?exam=NEET"
              className="w-full p-md rounded-xl bg-surface-container-high hover:bg-surface-bright transition-colors flex items-center justify-between border border-white/5"
            >
              <div className="flex items-center gap-md">
                <span className="material-symbols-outlined text-tertiary">history</span>
                <span className="font-semibold">Mistake Vault</span>
              </div>
              <span className="bg-tertiary-container/30 text-tertiary text-[10px] px-2 py-0.5 rounded-full">Bank</span>
            </Link>
            <Link
              to="/practice"
              className="w-full p-md rounded-xl bg-surface-container-high hover:bg-surface-bright transition-colors flex items-center justify-between border border-white/5"
            >
              <div className="flex items-center gap-md">
                <span className="material-symbols-outlined text-secondary">menu_book</span>
                <span className="font-semibold">Study Material</span>
              </div>
              <span className="material-symbols-outlined">chevron_right</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
