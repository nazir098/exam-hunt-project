import { Link } from "react-router-dom";
import type { ChapterProgress } from "../api";
import { estimatedRecoveryGain } from "../utils/sessionResultInsights";
import { weakChapterPracticeUrl } from "../utils/weakChapters";

type Props = {
  weakChapters: ChapterProgress[];
  wrongCount: number;
  packId: string;
};

export default function TestResultRecoveryCard({ weakChapters, wrongCount, packId }: Props) {
  const plan = weakChapters.slice(0, 3);
  const gain = estimatedRecoveryGain(wrongCount, plan);
  const recoveryUrl =
    plan.length > 0 ? weakChapterPracticeUrl(plan[0], packId) : "/practice?exam=NEET";

  if (plan.length === 0) {
    return (
      <section className="glass-card test-result-recovery" aria-label="Recovery plan">
        <header className="test-result-recovery__head">
          <span className="material-symbols-outlined">route</span>
          <h2 className="session-result-section__title">Recovery plan</h2>
        </header>
        <p className="test-result-recovery__empty muted">
          Solid run — start a focused practice session to keep momentum.
        </p>
        <Link to="/practice" className="btn primary btn-block test-result-recovery__cta">
          Start Practice Session
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
      </section>
    );
  }

  return (
    <section className="glass-card test-result-recovery" aria-label="Recovery plan">
      <header className="test-result-recovery__head">
        <span className="material-symbols-outlined">route</span>
        <h2 className="session-result-section__title">Recovery plan</h2>
      </header>
      <ol className="test-result-recovery__list">
        {plan.map((chapter, index) => (
          <li key={`${chapter.subject}-${chapter.chapter}`}>
            <span className="test-result-recovery__rank">{index + 1}</span>
            <span className="test-result-recovery__chapter">{chapter.chapter}</span>
            <span className="test-result-recovery__pct">{chapter.accuracyPercent}%</span>
          </li>
        ))}
      </ol>
      {gain > 0 && (
        <p className="test-result-recovery__gain">
          Estimated gain: <strong>+{gain} marks</strong>
        </p>
      )}
      <Link to={recoveryUrl} className="btn primary btn-block test-result-recovery__cta">
        Start Recovery Session
        <span className="material-symbols-outlined">arrow_forward</span>
      </Link>
    </section>
  );
}
