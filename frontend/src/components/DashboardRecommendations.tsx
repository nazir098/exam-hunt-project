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
        icon: "track_changes",
        title: "Practice weak chapters",
        desc: formatWeakChapterDesc(weak),
        tooltip: formatWeakChapterTooltip(weak),
        to: weakChapterBankUrl(weak),
      }
    : {
        id: "weak",
        icon: "track_changes",
        title: "Practice weak chapters",
        desc: hasAttempts
          ? "Answer more questions to unlock chapter-level weak spots."
          : "Start practice — we'll surface your weakest chapters from real attempts.",
        tooltip: "Opens the question bank filtered to weak chapters.",
        to: "/practice",
      };

  const cards: RecCard[] = [
    weakCard,
    {
      id: "drill",
      icon: "lightbulb",
      title: weak ? `Drill ${weak.chapter}` : "Drill weak topic",
      desc: weak
        ? "Practice questions from your weakest chapter."
        : "Run a focused session after your first attempts.",
      tooltip: weak ? `Focused drill on ${weak.chapter}` : "Start practice to unlock drill targets.",
      to: weak ? weakChapterBankUrl(weak) : "/practice",
    },
    activeSession
      ? {
          id: "resume",
          icon: "play_circle",
          title: "Continue session",
          desc: `${activeSession.packId.replace("NEET_", "NEET ")} · Q${activeSession.currentIndex + 1} of ${activeSession.questionCount}`,
          tooltip: "Resume your in-progress session.",
          to: practiceCta,
        }
      : {
          id: "practice",
          icon: "bolt",
          title: "Practice & Bank",
          desc: "Sessions + PYQ browse in one hub.",
          tooltip: "Start adaptive practice or browse the question bank.",
          to: "/practice",
        },
    {
      id: "analytics",
      icon: "monitoring",
      title: "Analytics",
      desc: "Trends, heatmaps, and weak-area insights.",
      tooltip: "Accuracy trends, subject breakdowns, and activity heatmaps.",
      to: "/analytics",
    },
    {
      id: "leaderboard",
      icon: "emoji_events",
      title: "Leaderboard",
      desc: "Your rank vs peers this period.",
      tooltip: "Compare marks and accuracy with other scholars.",
      to: "/leaderboard",
    },
  ];

  return (
    <section className="dash-v2-recs" aria-label="Recommended for you">
      <div className="dash-v2-recs__head">
        <h2 className="dash-section-title">Recommended for you</h2>
        <Link to="/practice" className="dash-v2-recs__view-all">
          View all <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
      </div>
      <div className="dash-v2-recs__track">
        {cards.map((card) => (
          <Link
            key={card.id}
            to={card.to}
            className="dash-v2-rec-card glass-card hover-hint"
            data-tooltip={card.tooltip}
          >
            <span className="material-symbols-outlined dash-v2-rec-card__icon">{card.icon}</span>
            <strong>{card.title}</strong>
            <p>{card.desc}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
