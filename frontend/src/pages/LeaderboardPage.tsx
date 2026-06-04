import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import {
  fetchLeaderboard,
  LeaderboardEntry,
  LeaderboardPeriod,
  LeaderboardResponse,
} from "../api";
import { useAuth } from "../auth/AuthContext";
import {
  avatarHue,
  avatarInitials,
  filterEntries,
  formatLeaderboardPts,
  masteryLabel,
  podiumSlots,
  showTrendUp,
} from "../utils/leaderboardDisplay";

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
    return <div className={`lb-podium-slot lb-podium-slot--${place} lb-podium-slot--empty`} />;
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

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<LeaderboardPeriod>("weekly");
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

  const filtered = useMemo(
    () => filterEntries(data?.entries ?? [], search),
    [data?.entries, search]
  );

  const top3 = filtered.slice(0, 3);
  const rest = filtered.slice(3);
  const slots = podiumSlots(top3);
  const youInList = filtered.some((e) => e.you);
  const showYouCard = data?.you && !youInList && !search.trim();

  return (
    <main className="leaderboard-page pb-28 lg:pb-10 pt-4 lg:pt-8">
      <header className="lb-hero glass-card">
        <div className="lb-hero__badge" aria-hidden>
          <span className="material-symbols-outlined">emoji_events</span>
        </div>
        <div className="lb-hero__text">
          <p className="page-eyebrow">Community</p>
          <h1 className="leaderboard-page-title">Leaderboard</h1>
          <p className="lb-hero__desc">
            Compete on Practice marks — ranked weekly, monthly, or all-time.
          </p>
        </div>
      </header>

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

      {loading && <p className="leaderboard-loading">Loading rankings…</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && data && (
        <>
          {data.entries.length > 0 ? (
            <>
              <section className="lb-podium-wrap glass-card" aria-label="Top three">
                <div className="lb-podium">
                <PodiumSlot entry={slots[0]} place={2} />
                <PodiumSlot entry={slots[1]} place={1} />
                <PodiumSlot entry={slots[2]} place={3} />
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
                    <span>User</span>
                    <span>Marks</span>
                  </div>
                  <ol className="lb-table-list">
                    {rest.map((entry) => (
                      <LeaderboardTableRow key={entry.userId} entry={entry} />
                    ))}
                  </ol>
                </section>
              )}

              {search && filtered.length === 0 && (
                <p className="lb-no-results">No scholars match &ldquo;{search}&rdquo;</p>
              )}

              {top3.length > 0 && rest.length === 0 && !search && data.entries.length <= 3 && (
                <p className="leaderboard-count lb-table-note">Top {data.entries.length} on the board</p>
              )}
            </>
          ) : (
            <section className="leaderboard-empty glass-card">
              <span className="material-symbols-outlined leaderboard-empty__icon">emoji_events</span>
              <p>
                No Practice marks in this period yet. Try All-Time or start a session.
              </p>
              <Link to="/practice" className="electric-glow-bg leaderboard-empty__cta">
                Go to Practice
              </Link>
            </section>
          )}

          {showYouCard && data.you && (
            <section className="lb-you-card glass-card" aria-label="Your rank">
              <p className="lb-you-card__label">Your rank</p>
              <LeaderboardTableRow entry={data.you} />
            </section>
          )}

          {!user && (
            <p className="lb-guest-hint glass-card">
              <Link to="/login?next=/leaderboard" className="electric-glow-bg lb-guest-hint__btn">
                Sign in
              </Link>
              <span className="lb-guest-hint__text">to highlight your row on the board</span>
            </p>
          )}
        </>
      )}
    </main>
  );
}
