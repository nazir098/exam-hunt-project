import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchBookmarkStatus, toggleBookmark } from "../api";
import { useAuth } from "../auth/AuthContext";
import { usePlatformSettings } from "../settings/PlatformSettingsContext";

type Props = {
  questionId: string;
  variant?: "icon" | "full";
  className?: string;
};

export default function BookmarkButton({ questionId, variant = "full", className = "" }: Props) {
  const { user } = useAuth();
  const { settings } = usePlatformSettings();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !settings.bookmarksEnabled || !questionId) {
      setSaved(false);
      return;
    }
    let cancelled = false;
    fetchBookmarkStatus(questionId)
      .then((s) => {
        if (!cancelled) setSaved(s.saved);
      })
      .catch(() => {
        if (!cancelled) setSaved(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, questionId, settings.bookmarksEnabled]);

  const onToggle = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    try {
      const res = await toggleBookmark(questionId);
      setSaved(res.saved);
    } finally {
      setBusy(false);
    }
  }, [user, questionId]);

  if (!settings.bookmarksEnabled) return null;

  if (!user) {
    return (
      <Link
        to={`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`}
        className={className}
        title="Sign in to save for revision"
      >
        {variant === "icon" ? (
          <span className="material-symbols-outlined">bookmark</span>
        ) : (
          <>
            <span className="material-symbols-outlined">bookmark</span>
            Save for Revision
          </>
        )}
      </Link>
    );
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        className={className + (saved ? " text-primary" : "")}
        onClick={onToggle}
        disabled={busy}
        title={saved ? "Remove bookmark" : "Save for revision"}
        aria-pressed={saved}
      >
        <span className="material-symbols-outlined" style={saved ? { fontVariationSettings: "'FILL' 1" } : undefined}>
          bookmark
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={onToggle}
      disabled={busy}
      aria-pressed={saved}
    >
      <span className="material-symbols-outlined" style={saved ? { fontVariationSettings: "'FILL' 1" } : undefined}>
        bookmark
      </span>
      {saved ? "Saved" : "Save for Revision"}
    </button>
  );
}
