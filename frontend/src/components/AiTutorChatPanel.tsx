import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { aiTutorChat } from "../api";
import { useAuth } from "../auth/AuthContext";
import { usePlatformSettings } from "../settings/PlatformSettingsContext";

type Message = { role: "user" | "assistant"; text: string };

type Props = {
  questionId?: string;
  context?: string;
  compact?: boolean;
};

export default function AiTutorChatPanel({ questionId, context, compact }: Props) {
  const { user } = useAuth();
  const { settings } = usePlatformSettings();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (settings.aiTutorWelcome) {
      setMessages([{ role: "assistant", text: settings.aiTutorWelcome }]);
    }
  }, [settings.aiTutorWelcome]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    if (!user) return;
    setInput("");
    setError("");
    setMessages((m) => [...m, { role: "user", text }]);
    setBusy(true);
    try {
      const res = await aiTutorChat({ message: text, questionId, context });
      setMessages((m) => [...m, { role: "assistant", text: res.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach AI Tutor");
    } finally {
      setBusy(false);
    }
  }

  if (!settings.aiTutorMockEnabled) {
    return (
      <p className="text-body-sm text-on-surface-variant">
        AI Tutor is in preview — check back soon.{" "}
        <Link to="/practice">Practice</Link> with scored sessions meanwhile.
      </p>
    );
  }

  if (!user) {
    return (
      <div className="ai-tutor-chat-guest glass-card p-lg rounded-xl">
        <p className="text-body-sm text-on-surface-variant mb-md">{settings.aiTutorWelcome}</p>
        <Link to="/login?next=/ai-tutor" className="btn primary">
          Sign in to chat (demo tutor)
        </Link>
      </div>
    );
  }

  return (
    <div className={"ai-tutor-chat" + (compact ? " ai-tutor-chat--compact" : "")}>
      <div className="ai-tutor-chat__messages" role="log" aria-live="polite">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              "ai-tutor-chat__bubble " +
              (m.role === "user" ? "ai-tutor-chat__bubble--user" : "ai-tutor-chat__bubble--bot")
            }
          >
            {m.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {error && <p className="error-text text-body-sm">{error}</p>}
      <form className="ai-tutor-chat__form" onSubmit={send}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a doubt about this topic or PYQ…"
          disabled={busy}
        />
        <button type="submit" className="btn primary" disabled={busy || !input.trim()}>
          {busy ? "…" : "Send"}
        </button>
      </form>
      <p className="text-caption text-outline mt-2">Demo tutor — replies are configured by admin, not a live LLM.</p>
    </div>
  );
}
