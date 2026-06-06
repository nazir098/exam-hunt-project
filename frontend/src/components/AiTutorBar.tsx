import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { aiTutorHint } from "../api";
import { useAuth } from "../auth/AuthContext";
import { usePlatformSettings } from "../settings/PlatformSettingsContext";
import AiTutorChatPanel from "./AiTutorChatPanel";

export default function AiTutorBar() {
  const { questionId } = useParams();
  const { user } = useAuth();
  const { settings } = usePlatformSettings();
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showChat, setShowChat] = useState(false);

  if (!settings.aiTutorMockEnabled) {
    return (
      <div className="lumina-ai-bar">
        <p className="text-caption text-outline px-4 py-2">AI Tutor preview — open /ai-tutor for updates.</p>
      </div>
    );
  }

  async function runHint(mode: string) {
    if (!user) return;
    setBusy(true);
    try {
      const res = await aiTutorHint({ mode, questionId: questionId || undefined });
      setHint(res.text);
      setShowChat(false);
    } catch {
      setHint("Sign in and try again from the full AI Tutor page.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lumina-ai-bar">
      <div className="lumina-ai-bar-inner">
        <button
          type="button"
          className="lumina-ai-chip"
          disabled={!user || busy}
          onClick={() => runHint("hint")}
          title={user ? "AI Hint" : "Sign in"}
        >
          <span className="material-symbols-outlined">lightbulb</span>
          <span className="lumina-ai-chip-label">AI Hint</span>
        </button>
        <button
          type="button"
          className="lumina-ai-chip"
          disabled={!user || busy}
          onClick={() => runHint("explain")}
        >
          <span className="material-symbols-outlined">psychology</span>
          <span className="lumina-ai-chip-label">AI Explain</span>
        </button>
        {!showChat ? (
          <button
            type="button"
            className="lumina-ai-input-wrap lumina-ai-input-wrap--btn"
            onClick={() => {
              setShowChat(true);
              setHint(null);
            }}
          >
            <span className="text-body-sm text-on-surface-variant px-3">Ask a doubt…</span>
            <span className="lumina-ai-send">
              <span className="material-symbols-outlined">chat</span>
            </span>
          </button>
        ) : (
          <button type="button" className="lumina-ai-chip" onClick={() => setShowChat(false)}>
            Close chat
          </button>
        )}
        <Link to="/ai-tutor" className="lumina-ai-fab md-hidden" aria-label="Full AI Tutor">
          <span className="material-symbols-outlined">open_in_new</span>
        </Link>
      </div>
      {hint && (
        <p className="lumina-ai-hint-text text-body-sm text-on-surface px-4 pb-2">{hint}</p>
      )}
      {showChat && (
        <div className="lumina-ai-chat-expand px-4 pb-4">
          <AiTutorChatPanel questionId={questionId} compact />
        </div>
      )}
    </div>
  );
}
