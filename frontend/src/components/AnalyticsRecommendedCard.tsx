import { Link } from "react-router-dom";
import type { RecommendedPractice } from "../utils/practiceHub";
import { weakChapterPracticeUrl } from "../utils/weakChapters";
import type { ChapterProgress } from "../api";

type Props = {
  recommended: RecommendedPractice | null;
  weakChapter: ChapterProgress | null;
};

export default function AnalyticsRecommendedCard({ recommended, weakChapter }: Props) {
  if (!recommended) {
    return (
      <section className="analytics-recommended-promo glass-card">
        <h2 className="analytics-recommended-promo__title">Recommended practice</h2>
        <p className="analytics-empty">Practice a few questions to unlock personalized recommendations.</p>
      </section>
    );
  }

  const href = weakChapter
    ? weakChapterPracticeUrl(weakChapter, recommended.packId)
    : `/practice?exam=NEET&packId=${encodeURIComponent(recommended.packId)}`;

  return (
    <section className="analytics-recommended-promo glass-card" aria-label="Recommended practice">
      <div className="analytics-recommended-promo__head">
        <span className="material-symbols-outlined analytics-recommended-promo__icon">auto_awesome</span>
        <div>
          <p className="analytics-recommended-promo__eyebrow">{recommended.reasonLabel}</p>
          <h2 className="analytics-recommended-promo__title">{recommended.chapterTitle}</h2>
          <p className="analytics-recommended-promo__sub">{recommended.benefitDetail}</p>
        </div>
      </div>
      <Link to={href} className="btn primary analytics-recommended-promo__cta">
        {recommended.ctaLabel} →
      </Link>
    </section>
  );
}
