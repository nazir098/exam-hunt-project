import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import {
  fetchLeaderboard,
  LeaderboardActivityItem,
  LeaderboardEntry,
  LeaderboardPeriod,
  LeaderboardResponse,
  LeaderboardStats,
} from "../api";
import { useAuth } from "../auth/AuthContext";
import {
  achievementHighlights,
  communityPulse,
  defaultStats,
  periodMotivation,
  scholarTitle,
  weeklyBadges,
  type AchievementCard,
  type ScholarBadge,
} from "../utils/leaderboardGamification";
import {
  avatarHue,
  avatarInitials,
  filterEntries,
  formatLeaderboardPts,
  masteryLabel,
  podiumSlots,
  showTrendUp,
} from "../utils/leaderboardDisplay";
import AppLoader from "../components/AppLoader";

const PERIODS: { id: LeaderboardPeriod; label: string }[] = [
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "all", label: "All-Time" },
];

function LeaderboardAvatar({
  entry,
  size = "md",
  glow,
}: {
  entry: LeaderboardEntry;
  size?: "sm" | "md" | "lg";
  glow?: "gold" | "silver" | "bronze" | "default";
}) {
  const hue = avatarHue(entry.userId);
  return (
    <div
      className={`lb-avatar lb-avatar--${size}${glow ? ` lb-avatar--glow-${glow}` : ""}`}
      style={{ "--lb-avatar-hue": `${hue}` } as CSSProperties}
      aria-hidden
    >
      <span>{avatarInitials(entry.displayName)}</span>
    </div>
  );
}

function PodiumSlot({ entry, place }: { entry: LeaderboardEntry | null; place: 1 | 2 | 3 }) {
  if (!entry) {
    return (
      <div className={`lb-podium-slot lb-podium-slot--${place} lb-podium-slot--ghost`}>
        <div className="lb-podium-slot__avatar-wrap">
          <div className={`lb-avatar lb-avatar--${place === 1 ? "lg" : "md"} lb-avatar--ghost`}>
            <span className="material-symbols-outlined">person_add</span>
          </div>
          <span className="lb-podium-slot__badge lb-podium-slot__badge--ghost" aria-hidden>
            {place}
          </span>
        </div>
        <p className="lb-podium-slot__name">Open slot</p>
        <p className="lb-podium-slot__pts">Claim #{place}</p>
        <div className="lb-podium-slot__pedestal" aria-hidden />
      </div>
    );
  }
  const glow = place === 1 ? "gold" : place === 2 ? "silver" : "bronze";
  return (
    <div className={`lb-podium-slot lb-podium-slot--${place}${entry.you ? " lb-podium-slot--you" : ""}`}>
      <div className="lb-podium-slot__avatar-wrap">
        <LeaderboardAvatar entry={entry} size={place === 1 ? "lg" : "md"} glow={glow} />
        <span className="lb-podium-slot__badge" aria-hidden>
          {place === 1 ? (
            <span className="material-symbols-outlined">emoji_events</span>
          ) : (
            place
          )}
        </span>
      </div>
      <p className="lb-podium-slot__name">{entry.displayName}</p>
      <p className="lb-podium-slot__pts">{formatLeaderboardPts(entry.totalMarks)}</p>
      <div className="lb-podium-slot__pedestal" aria-hidden />
    </div>
  );
}

function ScholarCard({ entry }: { entry: LeaderboardEntry }) {
  const tone = entry.rank === 1 ? "gold" : entry.rank === 2 ? "silver" : "bronze";
  return (
    <article className={`lb-scholar-card lb-scholar-card--${tone}${entry.you ? " lb-scholar-card--you" : ""}`}>
      <div className="lb-scholar-card__rank">#{entry.rank}</div>
      <LeaderboardAvatar
        entry={entry}
        size="md"
        glow={entry.rank <= 3 ? (tone as "gold" | "silver" | "bronze") : "default"}
      />
      <div className="lb-scholar-card__body">
        <p className="lb-scholar-card__title">{scholarTitle(entry.rank)}</p>
        <p className="lb-scholar-card__name">
          {entry.displayName}
          {entry.you && <span className="lb-scholar-card__you">You</span>}
        </p>
        <p className="lb-scholar-card__pts">{formatLeaderboardPts(entry.totalMarks)}</p>
        <p className="lb-scholar-card__meta">
          {entry.accuracyPercent}% · {entry.attempts} attempts
        </p>
      </div>
      {entry.rank === 1 && (
        <span className="lb-scholar-card__crown material-symbols-outlined" aria-hidden>
          workspace_premium
        </span>
      )}
    </article>
  );
}

function AchievementTile({ card }: { card: AchievementCard }) {
  return (
    <div className={`lb-achievement lb-achievement--${card.tone}`}>
      <span className="material-symbols-outlined lb-achievement__icon">{card.icon}</span>
      <div>
        <p className="lb-achievement__title">{card.title}</p>
        <p className="lb-achievement__sub">{card.subtitle}</p>
        <p className="lb-achievement__highlight">{card.highlight}</p>
      </div>
    </div>
  );
}

function BadgeTile({ badge }: { badge: ScholarBadge }) {
  const pct =
    badge.target && badge.progress != null
      ? Math.min(100, Math.round((badge.progress / badge.target) * 100))
      : badge.earned
        ? 100
        : 0;
  return (
    <div className={`lb-badge-tile${badge.earned ? " lb-badge-tile--earned" : ""}`}>
      <div className="lb-badge-tile__icon-wrap">
        <span className="material-symbols-outlined">{badge.icon}</span>
        {badge.earned && (
          <span className="lb-badge-tile__check material-symbols-outlined" aria-hidden>
            check_circle
          </span>
        )}
      </div>
      <p className="lb-badge-tile__title">{badge.title}</p>
      <p className="lb-badge-tile__desc">{badge.desc}</p>
      {badge.target != null && badge.progress != null && !badge.earned && (
        <div className="lb-badge-tile__bar" aria-hidden>
          <div className="lb-badge-tile__bar-fill" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

function ActivityRow({ item }: { item: LeaderboardActivityItem }) {
  return (
    <li className="lb-activity-row">
      <span
        className={`lb-activity-row__dot${item.correct ? " lb-activity-row__dot--ok" : " lb-activity-row__dot--miss"}`}
        aria-hidden
      />
      <div className="lb-activity-row__text">
        <strong>{item.displayName}</strong>
        <span>
          {item.correct ? " scored " : " attempted "}
          <span className={item.marksAwarded >= 0 ? "lb-activity-row__marks" : "lb-activity-row__marks--neg"}>
            {item.marksAwarded >= 0 ? "+" : ""}
            {item.marksAwarded}
          </span>{" "}
          marks
        </span>
      </div>
      <time className="lb-activity-row__time">{item.relativeTime}</time>
    </li>
  );
}

function LeaderboardTableRow({ entry }: { entry: LeaderboardEntry }) {
  const rankStr = String(entry.rank).padStart(2, "0");
  const trendUp = showTrendUp(entry);
  return (
    <li className={`lb-table-row${entry.you ? " lb-table-row--you" : ""}`}>
      <span className="lb-table-row__rank">{rankStr}</span>
      <div className="lb-table-row__user">
        <LeaderboardAvatar entry={entry} size="sm" />
        <div className="lb-table-row__text">
          <span className="lb-table-row__name">
            {entry.displayName}
            {entry.you && <span className="lb-table-row__you">You</span>}
          </span>
          <span className="lb-table-row__mastery">{masteryLabel(entry)}</span>
        </div>
      </div>
      <div className="lb-table-row__score">
        <span className="lb-table-row__pts">{formatLeaderboardPts(entry.totalMarks)}</span>
        <span
          className={`material-symbols-outlined lb-table-row__trend${
            trendUp ? " lb-table-row__trend--up" : " lb-table-row__trend--flat"
          }`}
          aria-hidden
        >
          {trendUp ? "trending_up" : "trending_flat"}
        </span>
      </div>
    </li>
  );
}

function PlatformStatsStrip({ stats }: { stats: LeaderboardStats }) {
  const pulse = communityPulse(stats);
  return (
    <section className="lb-platform-stats" aria-label="Platform statistics">
      {pulse.map((s) => (
        <div key={s.label} className="lb-platform-stat glass-card">
          <span className="material-symbols-outlined lb-platform-stat__icon">{s.icon}</span>
          <span className="lb-platform-stat__value">{s.value}</span>
          <span className="lb-platform-stat__label">{s.label}</span>
        </div>
      ))}
      {stats.questionBankSize > 0 && (
        <div className="lb-platform-stat glass-card lb-platform-stat--wide">
          <span className="material-symbols-outlined lb-platform-stat__icon">menu_book</span>
          <span className="lb-platform-stat__value">{stats.questionBankSize.toLocaleString()}</span>
          <span className="lb-platform-stat__label">PYQs in the arena</span>
        </div>
      )}
    </section>
  );
}

function WeeklyChallengeBar({
  stats,
  you,
}: {
  stats: LeaderboardStats;
  you: LeaderboardEntry | null | undefined;
}) {
  const target = stats.weeklyChallengeTarget || 250;
  const communityPct = Math.min(100, Math.round((stats.totalMarks / target) * 100));
  const yourMarks = you?.totalMarks ?? 0;
  const yourPct = Math.min(100, Math.round((yourMarks / target) * 100));

  return (
    <section className="lb-challenge glass-card" aria-label="Weekly community challenge">
      <div className="lb-challenge__head">
        <div>
          <p className="lb-challenge__eyebrow">Weekly arena heat</p>
          <h2 className="lb-challenge__title">{target.toLocaleString()} mark community goal</h2>
        </div>
        <span className="lb-challenge__pct">{communityPct}%</span>
      </div>
      <div className="lb-challenge__track">
        <div className="lb-challenge__fill lb-challenge__fill--community" style={{ width: `${communityPct}%` }} />
      </div>
      <p className="lb-challenge__meta">
        {stats.totalMarks.toLocaleString()} / {target.toLocaleString()} marks scored collectively
        {you && (
          <>
            {" "}
            · Your contribution: <strong>{yourMarks}</strong> ({yourPct}%)
          </>
        )}
      </p>
    </section>
  );
}

function LeaderboardEmptyState({
  stats,
  period,
  isGuest,
}: {
  stats: LeaderboardStats;
  period: LeaderboardPeriod;
  isGuest: boolean;
}) {
  return (
    <section className="lb-empty-rich glass-card">
      <div className="lb-empty-rich__glow" aria-hidden />
      <span className="material-symbols-outlined lb-empty-rich__icon">rocket_launch</span>
      <h2 className="lb-empty-rich__title">The arena is warming up</h2>
      <p className="lb-empty-rich__lead">
        No ranked marks yet for this {period === "weekly" ? "week" : period === "monthly" ? "month" : "period"}.
        {stats.allTimeScholars > 0
          ? ` ${stats.allTimeScholars} scholar${stats.allTimeScholars === 1 ? " has" : "s have"} played before — be the one to light up this board.`
          : " Be the pioneer scholar everyone else chases."}
      </p>
      <ul className="lb-empty-rich__perks">
        <li>
          <span className="material-symbols-outlined">bolt</span>
          +4 / −1 NEET scoring on every answer
        </li>
        <li>
          <span className="material-symbols-outlined">emoji_events</span>
          Unlock badges as you climb
        </li>
        <li>
          <span className="material-symbols-outlined">insights</span>
          Track accuracy in Analytics
        </li>
      </ul>
      <div className="lb-empty-rich__ctas">
        <Link to="/practice" className="btn primary electric-glow-bg">
          Start practice — claim rank #1
        </Link>
        {isGuest ? (
          <Link to="/login?next=/leaderboard" className="btn">
            Sign in to save your rank
          </Link>
        ) : (
          <Link to="/bank?exam=NEET" className="btn">
            Browse PYQs first
          </Link>
        )}
      </div>
    </section>
  );
}

export default function LeaderboardPage() {
  const { user, progress } = useAuth();
  const [period, setPeriod] = useState<LeaderboardPeriod>("monthly");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError("");
    fetchLeaderboard(50, period)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load leaderboard"))
      .finally(() => setLoading(false));
  }, [user?.id, period]);

  const stats = data?.stats ?? defaultStats();
  const activity = data?.recentActivity ?? [];
  const entries = data?.entries ?? [];

  const filtered = useMemo(() => filterEntries(entries, search), [entries, search]);
  const top3 = filtered.slice(0, 3);
  const rest = filtered.slice(3);
  const slots = podiumSlots(top3);
  const youInList = filtered.some((e) => e.you);
  const showYouCard = data?.you && !youInList && !search.trim();

  const motivation = periodMotivation(period, stats, data?.totalPlayers ?? 0);
  const achievements = achievementHighlights(entries);
  const badges = weeklyBadges(stats, data?.you, progress);
  const earnedBadgeCount = badges.filter((b) => b.earned).length;
  const hasRankedEntries = entries.length > 0;
  const sparseBoard = entries.length > 0 && entries.length < 5;

  return (
    <main className="leaderboard-page pt-4 lg:pt-8">
      <header className="lb-hero glass-card lb-hero--rich">
        <div className="lb-hero__badge lb-hero__badge--pulse" aria-hidden>
          <span className="material-symbols-outlined">emoji_events</span>
        </div>
        <div className="lb-hero__text">
          <p className="page-eyebrow">Live arena</p>
          <h1 className="leaderboard-page-title">Scholar Leaderboard</h1>
          <p className="lb-hero__headline">{motivation.headline}</p>
          <p className="lb-hero__desc">{motivation.sub}</p>
        </div>
        {data && !loading && (
          <div className="lb-hero__live" aria-label="Live status">
            <span className="lb-hero__live-dot" />
            Live
          </div>
        )}
      </header>

      {!loading && !error && <PlatformStatsStrip stats={stats} />}

      <div className="lb-period-tabs" role="tablist" aria-label="Leaderboard period">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={period === p.id}
            className={`lb-period-tab${period === p.id ? " lb-period-tab--active" : ""}`}
            onClick={() => setPeriod(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="lb-skeleton glass-card" aria-busy="true">
          <AppLoader
            variant="inline"
            label="Loading arena data…"
            hint="Fetching scholar rankings"
            icon="emoji_events"
          />
        </div>
      )}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && data && (
        <>
          <WeeklyChallengeBar stats={stats} you={data.you} />

          {sparseBoard && hasRankedEntries && (
            <p className="lb-sparse-banner glass-card">
              <span className="material-symbols-outlined">local_fire_department</span>
              Small board, big opportunity — top spots are still within reach.
            </p>
          )}

          <div className="lb-arena-layout">
            <div className="lb-arena-layout__main">
          {hasRankedEntries ? (
            <>
              <div className="lb-top-showcase">
                {top3.length > 0 && (
                  <section className="lb-scholars-scroll" aria-label="Top scholars">
                    <div className="lb-section-head">
                      <h2 className="lb-section-title">Top scholars</h2>
                      <span className="lb-section-meta">{data.totalPlayers} competing</span>
                    </div>
                    <div className="lb-scholars-track">
                      {top3.map((e) => (
                        <ScholarCard key={e.userId} entry={e} />
                      ))}
                      {top3.length < 3 &&
                        Array.from({ length: 3 - top3.length }).map((_, i) => (
                          <article key={`invite-${i}`} className="lb-scholar-card lb-scholar-card--invite">
                            <span className="material-symbols-outlined lb-scholar-card__invite-icon">person_add</span>
                            <p className="lb-scholar-card__title">Open podium</p>
                            <p className="lb-scholar-card__name">Your profile here</p>
                            <Link to="/practice" className="btn btn-sm primary">
                              Earn it
                            </Link>
                          </article>
                        ))}
                    </div>
                  </section>
                )}

                <section className="lb-podium-wrap glass-card" aria-label="Podium">
                  <p className="lb-podium-wrap__label">Podium</p>
                  <div className="lb-podium">
                    <PodiumSlot entry={slots[0]} place={2} />
                    <PodiumSlot entry={slots[1]} place={1} />
                    <PodiumSlot entry={slots[2]} place={3} />
                  </div>
                </section>
              </div>

              {achievements.length > 0 && (
                <section className="lb-achievements-section" aria-label="Achievement highlights">
                  <div className="lb-section-head">
                    <h2 className="lb-section-title">Achievement highlights</h2>
                  </div>
                  <div className="lb-achievements-grid">
                    {achievements.map((c) => (
                      <AchievementTile key={c.id} card={c} />
                    ))}
                  </div>
                </section>
              )}

              <section className="lb-badges-section glass-card" aria-label="Weekly badges">
                <div className="lb-section-head">
                  <h2 className="lb-section-title">Weekly badges &amp; rewards</h2>
                  <span className="lb-section-meta">
                    {earnedBadgeCount}/{badges.length} unlocked
                  </span>
                </div>
                <div className="lb-badges-grid">
                  {badges.map((b) => (
                    <BadgeTile key={b.id} badge={b} />
                  ))}
                </div>
              </section>

              <div className="lb-search-wrap">
                <span className="material-symbols-outlined lb-search-icon" aria-hidden>
                  search
                </span>
                <input
                  type="search"
                  className="lb-search"
                  placeholder="Search scholar rank…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search leaderboard"
                />
              </div>

              {rest.length > 0 && (
                <section className="lb-table glass-card" aria-label="Rankings">
                  <div className="lb-table-head">
                    <span>Rank</span>
                    <span>Scholar</span>
                    <span>Marks</span>
                  </div>
                  <ol className="lb-table-list">
                    {rest.map((entry) => (
                      <LeaderboardTableRow key={entry.userId} entry={entry} />
                    ))}
                  </ol>
                </section>
              )}

              {top3.length > 0 && rest.length === 0 && !search && entries.length <= 3 && (
                <p className="lb-rank-cta glass-card">
                  You&apos;re viewing the full podium —{" "}
                  <Link to="/practice">practice more</Link> to widen the gap or defend #1.
                </p>
              )}

              {search && filtered.length === 0 && (
                <p className="lb-no-results">No scholars match &ldquo;{search}&rdquo;</p>
              )}
            </>
          ) : (
            <LeaderboardEmptyState stats={stats} period={period} isGuest={!user} />
          )}
            </div>

            <aside className="lb-arena-layout__side" aria-label="Arena sidebar">
          <section className="lb-activity glass-card" aria-label="Recent activity">
            <div className="lb-section-head">
              <h2 className="lb-section-title">Recent activity</h2>
              <span className="lb-section-meta">Live feed</span>
            </div>
            {activity.length > 0 ? (
              <ul className="lb-activity-list">
                {activity.map((item, i) => (
                  <ActivityRow key={`${item.displayName}-${item.relativeTime}-${i}`} item={item} />
                ))}
              </ul>
            ) : (
              <div className="lb-activity-empty">
                <span className="material-symbols-outlined">history</span>
                <p>Attempts will appear here as scholars practice — yours could be first.</p>
                <Link to="/practice" className="btn primary btn-sm">
                  Log activity now
                </Link>
              </div>
            )}
          </section>

          {showYouCard && data.you && (
            <section className="lb-you-card glass-card lb-you-card--prominent" aria-label="Your rank">
              <p className="lb-you-card__label">Your standing</p>
              <p className="lb-you-card__hint">
                You&apos;re ranked #{data.you.rank} — {data.you.rank <= 3 ? "podium pressure!" : "push for top 3."}
              </p>
              <LeaderboardTableRow entry={data.you} />
            </section>
          )}
            </aside>
          </div>

          {!user && (
            <p className="lb-guest-hint glass-card">
              <Link to="/login?next=/leaderboard" className="electric-glow-bg lb-guest-hint__btn">
                Sign in
              </Link>
              <span className="lb-guest-hint__text">
                to unlock badges, highlight your row, and join the weekly challenge
              </span>
            </p>
          )}
        </>
      )}
    </main>
  );
}
