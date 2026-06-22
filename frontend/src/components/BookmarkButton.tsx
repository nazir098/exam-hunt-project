import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchBookmarkStatus, toggleBookmark } from "../api";
import { useAuth } from "../auth/AuthContext";
import { usePlatformSettings } from "../settings/PlatformSettingsContext";

type Props = {
  questionId: string;
  variant?: "icon" | "full" | "compact";
  className?: string;
  /** When set, skips per-question status fetch (e.g. bank list batch load). */
  saved?: boolean;
  onSavedChange?: (saved: boolean) => void;
  /** Parent loads status in bulk; do not fetch per question. */
  batchStatus?: boolean;
};

export default function BookmarkButton({
  questionId,
  variant = "full",
  className = "",
  saved: savedProp,
  onSavedChange,
  batchStatus = false,
}: Props) {
  const { user } = useAuth();
  const { settings } = usePlatformSettings();
  const [savedLocal, setSavedLocal] = useState(false);
  const [busy, setBusy] = useState(false);
  const controlled = savedProp !== undefined || batchStatus;
  const saved = controlled ? (savedProp ?? false) : savedLocal;

  useEffect(() => {
    if (controlled || !user || !settings.bookmarksEnabled || !questionId) {
      if (!controlled) setSavedLocal(false);
      return;
    }
    let cancelled = false;
    fetchBookmarkStatus(questionId)
      .then((s) => {
        if (!cancelled) setSavedLocal(s.saved);
      })
      .catch(() => {
        if (!cancelled) setSavedLocal(false);
      });
    return () => {
      cancelled = true;
    };
  }, [controlled, user, questionId, settings.bookmarksEnabled]);

  const onToggle = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    try {
      const res = await toggleBookmark(questionId);
      if (controlled) {
        onSavedChange?.(res.saved);
      } else {
        setSavedLocal(res.saved);
      }
    } finally {
      setBusy(false);
    }
  }, [user, questionId, controlled, onSavedChange]);

  if (!settings.bookmarksEnabled) return null;

  if (!user) {
    const guestBody =
      variant === "icon" ? (
        <span className="material-symbols-outlined">bookmark</span>
      ) : variant === "compact" ? (
        <>
          <span className="material-symbols-outlined" aria-hidden>
            bookmark
          </span>
          <span className="question-secondary-actions__label">Save</span>
          <span className="question-secondary-actions__label question-secondary-actions__label--wide">
            Save for revision
          </span>
        </>
      ) : (
        <>
          <span className="material-symbols-outlined">bookmark</span>
          Save for Revision
        </>
      );
    return (
      <Link
        to={`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`}
        className={className}
        title="Sign in to save for revision"
      >
        {guestBody}
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

  if (variant === "compact") {
    return (
      <button
        type="button"
        className={className + (saved ? " is-active" : "")}
        onClick={onToggle}
        disabled={busy}
        aria-pressed={saved}
        title={saved ? "Remove bookmark" : "Save for revision"}
      >
        <span
          className="material-symbols-outlined"
          style={saved ? { fontVariationSettings: "'FILL' 1" } : undefined}
          aria-hidden
        >
          bookmark
        </span>
        <span className="question-secondary-actions__label">{saved ? "Saved" : "Save"}</span>
        <span className="question-secondary-actions__label question-secondary-actions__label--wide">
          {saved ? "Saved" : "Save for revision"}
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
