import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { fetchBookmarks, type BookmarkItem } from "../api";
import { useAuth } from "../auth/AuthContext";
import PracticeAiPanel from "../components/PracticeAiPanel";
import { usePlatformSettings } from "../settings/PlatformSettingsContext";
import { examDisplayName } from "../utils/labels";

export default function RevisionPage() {
  const { user, loading } = useAuth();
  const { settings } = usePlatformSettings();
  const [items, setItems] = useState<BookmarkItem[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!user?.id || !settings.bookmarksEnabled) {
      setBusy(false);
      return;
    }
    setBusy(true);
    fetchBookmarks()
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load bookmarks"))
      .finally(() => setBusy(false));
  }, [user, settings.bookmarksEnabled]);

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

  if (!settings.bookmarksEnabled) {
    return (
      <main className="stitch-page revision-page pt-6">
        <h1 className="text-headline">Revision</h1>
        <p className="text-body text-on-surface-variant">Bookmarks are temporarily disabled.</p>
      </main>
    );
  }

  return (
    <main className="stitch-page revision-page pt-6 space-y-lg">
      <header>
        <h1 className="text-headline text-on-surface">Saved for revision</h1>
        <p className="text-body-sm text-on-surface-variant mt-2">
          PYQs you bookmarked from the bank or question detail.
        </p>
      </header>

      {error && <p className="error-text">{error}</p>}
      {busy && <p className="text-body text-on-surface-variant">Loading bookmarks…</p>}

      {!busy && items.length === 0 && (
        <div className="glass-card p-lg rounded-xl">
          <p className="text-body text-on-surface-variant">No saved questions yet.</p>
          <Link to="/bank?exam=NEET" className="btn primary mt-md inline-flex">
            Browse question bank
          </Link>
        </div>
      )}

      <PracticeAiPanel
        featureIds={["revision_notes", "weak_chapter_analysis", "practice_from_weak"]}
        title="AI revision help"
      />

      <ul className="revision-list space-y-md">
        {items.map((b) => (
          <li key={b.questionId} className="glass-card p-lg rounded-xl revision-list__item">
            <div className="flex flex-wrap gap-2 text-caption text-secondary mb-2">
              <span>{examDisplayName(b.exam, b.year)}</span>
              <span>·</span>
              <span>{b.subject}</span>
              {b.chapter && (
                <>
                  <span>·</span>
                  <span>{b.chapter}</span>
                </>
              )}
            </div>
            <p className="text-body-md line-clamp-2 mb-md">
              {b.questionTextPreview || `Question ${b.questionNo}`}
            </p>
            {b.note && <p className="text-caption text-outline mb-md">Note: {b.note}</p>}
            <Link to={`/question/${b.questionId}`} className="btn">
              Open question
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
