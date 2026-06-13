import { Link } from "react-router-dom";
import type { ChapterProgress } from "../api";
import { weakChapterPracticeUrl } from "../utils/weakChapters";

type Props = {
  chapters: ChapterProgress[];
  defaultPackId?: string;
  loading?: boolean;
};

export default function PracticeWeakAreas({ chapters, defaultPackId, loading }: Props) {
  const top = chapters.slice(0, 3);

  if (loading) {
    return (
      <section className="glass-card practice-weak-areas" aria-busy="true">
        <p className="practice-weak-areas__loading">Loading weak areas…</p>
      </section>
    );
  }

  if (top.length === 0) {
    return null;
  }

  const primary = top[0];

  return (
    <section className="glass-card practice-weak-areas" aria-labelledby="practice-weak-heading">
      <div className="practice-weak-areas__head">
        <h2 id="practice-weak-heading" className="practice-section-title">
          Weak areas
        </h2>
      </div>
      <ul className="practice-weak-areas__list">
        {top.map((ch) => (
          <li key={`${ch.subject}-${ch.chapter}`} className="practice-weak-areas__row">
            <span className="practice-weak-areas__name">{ch.chapter}</span>
            <span className="practice-weak-areas__pct">{ch.accuracyPercent}%</span>
          </li>
        ))}
      </ul>
      <Link
        to={weakChapterPracticeUrl(primary, defaultPackId)}
        className="btn btn-primary practice-weak-areas__cta"
      >
        Practice weak areas →
      </Link>
    </section>
  );
}
