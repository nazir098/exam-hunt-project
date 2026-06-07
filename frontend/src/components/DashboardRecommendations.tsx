import { Link } from "react-router-dom";
import type { PracticeSessionView, ProgressSummary } from "../api";
import {
  formatWeakChapterDesc,
  formatWeakChapterTooltip,
  primaryWeakChapter,
  weakChapterBankUrl,
} from "../utils/weakChapters";

type RecCard = {
  id: string;
  icon: string;
  title: string;
  desc: string;
  tooltip: string;
  to: string;
  primary: boolean;
};

type Props = {
  activeSession: PracticeSessionView | null;
  practiceCta: string;
  progress: ProgressSummary | null;
};

export default function DashboardRecommendations({
  activeSession,
  practiceCta,
  progress,
}: Props) {
  const weak = primaryWeakChapter(progress?.weakChapters);
  const hasAttempts = (progress?.totalAttempts ?? 0) > 0;

  const weakCard: RecCard = weak
    ? {
        id: "weak",
        icon: "target",
        title: "Practice weak chapters",
        desc: formatWeakChapterDesc(weak),
        tooltip: `${formatWeakChapterDesc(weak)}. Opens the question bank filtered to this chapter.`,
        to: weakChapterBankUrl(weak),
        primary: !activeSession,
      }
    : hasAttempts
      ? {
          id: "weak",
          icon: "target",
          title: "Practice weak chapters",
          desc: "Answer a few more questions in Practice to unlock chapter-level weak spots.",
          tooltip:
            "Complete more scored practice sessions so we can rank chapters by accuracy and marks lost.",
          to: "/practice",
          primary: !activeSession,
        }
      : {
          id: "weak",
          icon: "target",
          title: "Practice weak chapters",
          desc: "Start a scored session — we'll surface your weakest chapters from real attempts.",
          tooltip:
            "Your first practice sessions build a baseline. Weak chapters appear after real attempts with scoring.",
          to: "/practice",
          primary: !activeSession,
        };

  const cards: RecCard[] = [
    activeSession
      ? {
          id: "resume",
          icon: "play_circle",
          title: "Continue previous session",
          desc: `${activeSession.packId.replace("NEET_", "NEET ")} · question ${activeSession.currentIndex + 1} of ${activeSession.questionCount}`,
          tooltip: `Resume where you left off — question ${activeSession.currentIndex + 1} of ${activeSession.questionCount}. Progress and scoring carry over.`,
          to: practiceCta,
          primary: true,
        }
      : null,
    weakCard,
    {
      id: "next",
      icon: "lightbulb",
      title: weak ? `Drill ${weak.chapter}` : "Suggested next topic",
      desc: weak
        ? "Open the question bank filtered to your weakest chapter."
        : "Run a fresh adaptive NEET session — 20 questions, +4/−1 scoring",
      tooltip: weak
        ? `Focused drill on ${weak.subject} · ${weak.chapter} (${weak.accuracyPercent}% accuracy). Browse PYQs for this chapter only.`
        : "Start a 20-question adaptive practice session. Instant feedback, +4/−1 scoring, counts toward rank.",
      to: weak ? weakChapterBankUrl(weak) : "/practice",
      primary: false,
    },
  ].filter(Boolean) as RecCard[];

  return (
    <section className="dash-recs" aria-label="Recommended for you">
      <h2 className="dash-section-title">Recommended for you</h2>
      {progress?.weakChapters && progress.weakChapters.length > 1 && (
        <ul className="dash-recs__weak-list muted">
          {progress.weakChapters.slice(0, 3).map((c) => (
            <li key={`${c.subject}-${c.chapter}`}>
              <Link
                to={weakChapterBankUrl(c)}
                className="hover-hint dash-recs__weak-link"
                data-tooltip={formatWeakChapterTooltip(c)}
              >
                {c.subject} · {c.chapter} ({c.accuracyPercent}%)
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="dash-recs__grid">
        {cards.map((card) => (
          <Link
            key={card.id}
            to={card.to}
            className={`dash-rec-card glass-card hover-hint ${card.primary ? "dash-rec-card--primary" : ""}`}
            data-tooltip={card.tooltip}
          >
            <span className="material-symbols-outlined dash-rec-card__icon">{card.icon}</span>
            <div>
              <strong>{card.title}</strong>
              <p>{card.desc}</p>
            </div>
            <span className="material-symbols-outlined dash-rec-card__arrow">chevron_right</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
