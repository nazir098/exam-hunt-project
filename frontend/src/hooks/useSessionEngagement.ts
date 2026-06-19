import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { engagePracticeSession, pausePracticeSession, type PracticeSessionView } from "../api";

type Options = {
  sessionId: string;
  routeMode: "practice" | "test";
  enabled: boolean;
  onSessionUpdate: (session: PracticeSessionView) => void;
};

/** Start/pause session timer while the user is on a session question page. */
export function useSessionEngagement({
  sessionId,
  routeMode,
  enabled,
  onSessionUpdate,
}: Options) {
  const navigate = useNavigate();
  const engagedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !sessionId) return;

    let cancelled = false;

    async function engage() {
      try {
        const updated = await engagePracticeSession(sessionId);
        if (cancelled) return;
        onSessionUpdate(updated);
        engagedRef.current = updated.status === "active";
        if (updated.status === "completed") {
          const path =
            routeMode === "test"
              ? `/test/result/${sessionId}`
              : `/practice/result/${sessionId}`;
          navigate(path, { replace: true });
        }
      } catch {
        engagedRef.current = false;
      }
    }

    function pause() {
      if (!engagedRef.current) return;
      engagedRef.current = false;
      void pausePracticeSession(sessionId).catch(() => undefined);
    }

    void engage();

    function onVisibility() {
      if (document.hidden) pause();
      else void engage();
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", pause);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", pause);
      pause();
    };
  }, [enabled, sessionId, routeMode, navigate, onSessionUpdate]);
}
