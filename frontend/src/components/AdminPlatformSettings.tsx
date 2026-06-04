import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  adminClearMyBookmarks,
  adminSeedSampleBookmarks,
  fetchAdminSettings,
  updateAdminSettings,
  type AdminPlatformSettings,
} from "../api";
import { usePlatformSettings } from "../settings/PlatformSettingsContext";

export default function AdminPlatformSettingsPanel() {
  const { refresh: refreshPublic } = usePlatformSettings();
  const [data, setData] = useState<AdminPlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [pyqFloor, setPyqFloor] = useState("25000");
  const [displayQuestions, setDisplayQuestions] = useState("");
  const [displayChapters, setDisplayChapters] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [insightText, setInsightText] = useState("");
  const [insightHighlight, setInsightHighlight] = useState("");
  const [aiWelcome, setAiWelcome] = useState("");
  const [aiFallbacks, setAiFallbacks] = useState("");
  const [aiKeywords, setAiKeywords] = useState("");
  const [aiEnabled, setAiEnabled] = useState(true);
  const [bookmarksEnabled, setBookmarksEnabled] = useState(true);
  const [aiSuggestEnabled, setAiSuggestEnabled] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetchAdminSettings();
      setData(res);
      const p = res.publicSettings;
      setPyqFloor(String(p.marketingPyqFloor));
      setDisplayQuestions(p.displayTotalQuestions != null ? String(p.displayTotalQuestions) : "");
      setDisplayChapters(p.displayChapters != null ? String(p.displayChapters) : "");
      setSuggestions(p.bankSearchSuggestions.join("\n"));
      setInsightText(p.learningInsightText);
      setInsightHighlight(p.learningInsightHighlight);
      setAiWelcome(p.aiTutorWelcome);
      setAiFallbacks(res.aiTutorFallbackReplies.join("\n"));
      setAiKeywords(
        Object.entries(res.aiTutorKeywordReplies)
          .map(([k, v]) => `${k} => ${v}`)
          .join("\n")
      );
      setAiEnabled(p.aiTutorMockEnabled);
      setBookmarksEnabled(p.bookmarksEnabled);
      setAiSuggestEnabled(p.aiSuggestEnabled);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function parseKeywords(raw: string): Record<string, string> {
    const out: Record<string, string> = {};
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t) continue;
      const idx = t.indexOf("=>");
      if (idx < 0) continue;
      const key = t.slice(0, idx).trim();
      const val = t.slice(idx + 2).trim();
      if (key && val) out[key] = val;
    }
    return out;
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const updated = await updateAdminSettings({
        marketingPyqFloor: Number(pyqFloor) || 0,
        displayTotalQuestions: displayQuestions.trim() ? Number(displayQuestions) : null,
        displayChapters: displayChapters.trim() ? Number(displayChapters) : null,
        bankSearchSuggestions: suggestions
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        learningInsightText: insightText,
        learningInsightHighlight: insightHighlight,
        aiTutorWelcome: aiWelcome,
        aiTutorFallbackReplies: aiFallbacks
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        aiTutorKeywordReplies: parseKeywords(aiKeywords),
        aiTutorMockEnabled: aiEnabled,
        bookmarksEnabled,
        aiSuggestEnabled,
      });
      setData(updated);
      setMsg("Platform settings saved.");
      await refreshPublic();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function runSeedBookmarks() {
    setMsg(null);
    setErr(null);
    try {
      const res = await adminSeedSampleBookmarks(8);
      setMsg(typeof res.message === "string" ? res.message : JSON.stringify(res));
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Seed failed");
    }
  }

  async function runClearBookmarks() {
    setMsg(null);
    setErr(null);
    try {
      const res = await adminClearMyBookmarks();
      setMsg(typeof res.message === "string" ? res.message : JSON.stringify(res));
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Clear failed");
    }
  }

  if (loading) {
    return <p className="text-body-sm text-on-surface-variant">Loading platform settings…</p>;
  }

  return (
    <section className="admin-page__section">
      <h2 className="admin-page__section-title">Platform &amp; UI content</h2>
      <p className="text-body-sm text-on-surface-variant mb-md max-w-2xl">
        Controls marketing numbers, bank AI chips, filter copy, demo AI tutor replies, and feature toggles
        shown across the app.
      </p>
      {err && <p className="admin-page__folder-hint admin-page__folder-hint--error">{err}</p>}
      {msg && <p className="admin-page__folder-hint">{msg}</p>}
      <form className="admin-settings-form glass-card p-lg space-y-md" onSubmit={onSave}>
        <div className="admin-settings-form__grid">
          <label>
            <span className="text-caption text-outline">PYQ count floor (guest hero)</span>
            <input className="admin-page__input" value={pyqFloor} onChange={(e) => setPyqFloor(e.target.value)} />
          </label>
          <label>
            <span className="text-caption text-outline">Override total questions (empty = live)</span>
            <input
              className="admin-page__input"
              value={displayQuestions}
              onChange={(e) => setDisplayQuestions(e.target.value)}
              placeholder="e.g. 30000"
            />
          </label>
          <label>
            <span className="text-caption text-outline">Override chapters count (empty = live)</span>
            <input
              className="admin-page__input"
              value={displayChapters}
              onChange={(e) => setDisplayChapters(e.target.value)}
            />
          </label>
        </div>
        <label>
          <span className="text-caption text-outline">Bank search suggestions (one per line)</span>
          <textarea
            className="admin-page__input admin-page__textarea"
            rows={3}
            value={suggestions}
            onChange={(e) => setSuggestions(e.target.value)}
          />
        </label>
        <label>
          <span className="text-caption text-outline">Learning insight text (filters sidebar)</span>
          <input className="admin-page__input" value={insightText} onChange={(e) => setInsightText(e.target.value)} />
        </label>
        <label>
          <span className="text-caption text-outline">Learning insight highlight</span>
          <input
            className="admin-page__input"
            value={insightHighlight}
            onChange={(e) => setInsightHighlight(e.target.value)}
          />
        </label>
        <label>
          <span className="text-caption text-outline">AI tutor welcome message</span>
          <textarea
            className="admin-page__input admin-page__textarea"
            rows={2}
            value={aiWelcome}
            onChange={(e) => setAiWelcome(e.target.value)}
          />
        </label>
        <label>
          <span className="text-caption text-outline">AI fallback replies (one per line)</span>
          <textarea
            className="admin-page__input admin-page__textarea"
            rows={4}
            value={aiFallbacks}
            onChange={(e) => setAiFallbacks(e.target.value)}
          />
        </label>
        <label>
          <span className="text-caption text-outline">
            AI keyword replies — pattern =&gt; reply (pattern uses | for OR)
          </span>
          <textarea
            className="admin-page__input admin-page__textarea"
            rows={5}
            value={aiKeywords}
            onChange={(e) => setAiKeywords(e.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-md">
          <label className="flex items-center gap-2 text-body-sm">
            <input type="checkbox" checked={aiEnabled} onChange={(e) => setAiEnabled(e.target.checked)} />
            AI tutor mock enabled
          </label>
          <label className="flex items-center gap-2 text-body-sm">
            <input
              type="checkbox"
              checked={bookmarksEnabled}
              onChange={(e) => setBookmarksEnabled(e.target.checked)}
            />
            Bookmarks enabled
          </label>
          <label className="flex items-center gap-2 text-body-sm">
            <input
              type="checkbox"
              checked={aiSuggestEnabled}
              onChange={(e) => setAiSuggestEnabled(e.target.checked)}
            />
            AI Suggest on cards
          </label>
        </div>
        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? "Saving…" : "Save platform settings"}
        </button>
      </form>
      <div className="admin-page__grid mt-md">
        <article className="admin-card">
          <h3 className="admin-card__title">Seed sample bookmarks (your account)</h3>
          <p className="admin-card__desc">Adds up to 8 bookmarks from existing questions for testing /revision UI.</p>
          <button type="button" className="btn btn-block" onClick={runSeedBookmarks}>
            Seed bookmarks
          </button>
        </article>
        <article className="admin-card admin-card--danger">
          <h3 className="admin-card__title">Clear your bookmarks</h3>
          <p className="admin-card__desc">Removes all bookmarks for the signed-in admin user.</p>
          <button type="button" className="btn danger btn-block" onClick={runClearBookmarks}>
            Clear bookmarks
          </button>
        </article>
      </div>
      {data && (
        <p className="text-caption text-outline mt-md">
          Last loaded: {data.publicSettings.bankSearchSuggestions.length} suggestions,{" "}
          {data.aiTutorFallbackReplies.length} fallbacks, {Object.keys(data.aiTutorKeywordReplies).length} keyword rules.
        </p>
      )}
    </section>
  );
}
