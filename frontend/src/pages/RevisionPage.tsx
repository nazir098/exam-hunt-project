import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import {
  fetchBookmarks,
  fetchRevisionQueue,
  fetchRevisionSummary,
  markRevisionPending,
  markRevisionRevised,
  type BookmarkItem,
  type RevisionItemView,
  type RevisionSummary,
} from "../api";
import { useAuth } from "../auth/AuthContext";
import PracticeAiPanel from "../components/PracticeAiPanel";
import { usePlatformSettings } from "../settings/PlatformSettingsContext";
import { examDisplayName } from "../utils/labels";

type Tab = "pending" | "revised" | "bookmarks";

export default function RevisionPage() {
  const { user, loading } = useAuth();
  const { settings } = usePlatformSettings();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("status") as Tab) || "pending";
  const [tab, setTab] = useState<Tab>(initialTab === "revised" ? "revised" : initialTab === "bookmarks" ? "bookmarks" : "pending");
  const [queue, setQueue] = useState<RevisionItemView[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [summary, setSummary] = useState<RevisionSummary | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setBusy(true);
    setError("");
    try {
      const [s, q, b] = await Promise.all([
        fetchRevisionSummary(),
        fetchRevisionQueue(tab === "bookmarks" ? "all" : tab),
        settings.bookmarksEnabled ? fetchBookmarks() : Promise.resolve([]),
      ]);
      setSummary(s);
      setQueue(q);
      setBookmarks(b);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load revision queue");
    } finally {
      setBusy(false);
    }
  }, [user, tab, settings.bookmarksEnabled]);

  useEffect(() => {
    if (!user?.id) {
      setBusy(false);
      return;
    }
    load();
  }, [user, load]);

  async function toggleRevised(item: RevisionItemView) {
    setBusyId(item.questionId);
    try {
      if (item.pending) {
        await markRevisionRevised(item.questionId);
      } else {
        await markRevisionPending(item.questionId);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <main className="stitch-page">
        <p className="text-body text-on-surface-variant">Loading…</p>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login?next=/revision" replace />;
  }

  const pendingCount = summary?.pending ?? 0;

  return (
    <main className="stitch-page revision-page pt-6 space-y-lg">
      <header>
        <h1 className="text-headline text-on-surface">Revision queue</h1>
        <p className="text-body-sm text-on-surface-variant mt-2">
          Wrong answers from Practice and Test are queued here automatically. Mark items revised when you&apos;ve mastered them.
        </p>
        {summary && (
          <p className="revision-page__stats">
            <strong>{pendingCount}</strong> pending · <strong>{summary.revised}</strong> revised
          </p>
        )}
      </header>

      <div className="revision-page__tabs" role="tablist">
        {(["pending", "revised", "bookmarks"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`revision-page__tab${tab === t ? " is-active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "pending" ? `Pending (${pendingCount})` : t === "revised" ? "Revised" : "Bookmarks"}
          </button>
        ))}
      </div>

      {error && <p className="error-text">{error}</p>}
      {busy && <p className="text-body text-on-surface-variant">Loading…</p>}

      {!busy && tab !== "bookmarks" && queue.length === 0 && (
        <div className="glass-card p-lg rounded-xl">
          <p className="text-body text-on-surface-variant">
            {tab === "pending" ? "No pending revisions — great work!" : "No revised items yet."}
          </p>
          <Link to="/review/wrong-attempts" className="btn primary mt-md inline-flex">
            Review wrong attempts
          </Link>
        </div>
      )}

      {!busy && tab !== "bookmarks" && (
        <ul className="revision-list space-y-md">
          {queue.map((item) => (
            <li key={item.questionId} className="glass-card p-lg rounded-xl revision-list__item">
              <div className="flex flex-wrap gap-2 text-caption text-secondary mb-2">
                <span>{examDisplayName(item.exam, item.year)}</span>
                <span>·</span>
                <span>{item.subject}</span>
                <span>·</span>
                <span>{item.chapter}</span>
                <span className={`revision-list__badge${item.pending ? " revision-list__badge--pending" : ""}`}>
                  {item.pending ? "Pending" : "Revised"}
                </span>
              </div>
              <p className="text-body font-semibold">Question {item.questionNo}</p>
              <div className="flex flex-wrap gap-2 mt-md">
                <Link to={`/solve/${item.questionId}`} className="btn btn-sm primary">
                  Review now
                </Link>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={busyId === item.questionId}
                  onClick={() => toggleRevised(item)}
                >
                  {item.pending ? "Mark as revised" : "Mark pending again"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!busy && tab === "bookmarks" && (
        <>
          {!settings.bookmarksEnabled ? (
            <p className="text-body text-on-surface-variant">Bookmarks are temporarily disabled.</p>
          ) : bookmarks.length === 0 ? (
            <div className="glass-card p-lg rounded-xl">
              <p className="text-body text-on-surface-variant">No saved questions yet.</p>
              <Link to="/practice?exam=NEET#question-bank" className="btn primary mt-md inline-flex">
                Browse question bank
              </Link>
            </div>
          ) : (
            <ul className="revision-list space-y-md">
              {bookmarks.map((b) => (
                <li key={b.questionId} className="glass-card p-lg rounded-xl revision-list__item">
                  <div className="flex flex-wrap gap-2 text-caption text-secondary mb-2">
                    <span>{examDisplayName(b.exam, b.year)}</span>
                    <span>·</span>
                    <span>{b.subject}</span>
                  </div>
                  <Link to={`/solve/${b.questionId}`} className="text-body font-semibold text-primary">
                    Question {b.questionNo} →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <PracticeAiPanel
        featureIds={["revision_notes", "weak_chapter_analysis", "practice_from_weak"]}
        title="AI revision help"
      />
    </main>
  );
}
