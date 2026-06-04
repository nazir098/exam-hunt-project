import { Link, useSearchParams } from "react-router-dom";
import AiTutorChatPanel from "../components/AiTutorChatPanel";
import { BRAND_NAME } from "../design/stitchAssets";
import { usePlatformSettings } from "../settings/PlatformSettingsContext";

export default function AiTutorPage() {
  const [searchParams] = useSearchParams();
  const questionId = searchParams.get("questionId") || undefined;
  const { settings } = usePlatformSettings();

  return (
    <main className="stitch-page ai-tutor-page pt-6 space-y-lg">
      <section className="ai-tutor-hero glass-card">
        <span className="ai-tutor-hero__badge">
          <span className="material-symbols-outlined">psychology</span>
          {settings.aiTutorMockEnabled ? "Demo tutor · Admin configurable" : "Preview"}
        </span>
        <h1 className="ai-tutor-hero__title">AI Tutor</h1>
        <p className="ai-tutor-hero__lead">
          Guided explanations and doubt solving for {BRAND_NAME} PYQs — demo mode uses admin-tuned
          responses until a live model is connected.
        </p>
        <ul className="ai-tutor-features">
          <li>
            <span className="material-symbols-outlined">auto_awesome</span>
            Keyword-aware hints (rotation, optics, organic, …)
          </li>
          <li>
            <span className="material-symbols-outlined">forum</span>
            Chat with context from Analytics weak chapters
          </li>
          <li>
            <span className="material-symbols-outlined">school</span>
            Open from any question via AI Suggest
          </li>
        </ul>
        <div className="ai-tutor-hero__ctas">
          <Link to="/practice" className="btn">
            Practice
          </Link>
          <Link to="/revision" className="btn">
            Revision list
          </Link>
        </div>
      </section>

      <section className="glass-card p-lg rounded-xl">
        <h2 className="text-headline-md mb-md">Chat</h2>
        <AiTutorChatPanel
          questionId={questionId}
          context={questionId ? "Opened from a PYQ" : undefined}
        />
      </section>
    </main>
  );
}
