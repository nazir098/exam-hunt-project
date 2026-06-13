import type { RecommendedPractice } from "../utils/practiceHub";

type Props = {
  recommended: RecommendedPractice;
  busy: boolean;
  onStart: () => void;
};

export default function PracticeRecommendedCard({ recommended, busy, onStart }: Props) {
  return (
    <section className="practice-recommended glass-card" aria-label="Recommended practice">
      <div className="practice-recommended__inner">
        <header className="practice-recommended__head">
          <p className="practice-recommended__eyebrow">
            <span className="material-symbols-outlined">auto_awesome</span>
            Recommended for you
          </p>
          <span className="practice-recommended__coach-badge">AI coach pick</span>
        </header>

        <div className="practice-recommended__reason">
          <span className="practice-recommended__reason-label">{recommended.reasonLabel}</span>
          <h2 className="practice-recommended__title">{recommended.chapterTitle}</h2>
        </div>

        <div className="practice-recommended__stats">
          <div className="practice-recommended__stat">
            <span className="practice-recommended__stat-value">{recommended.accuracyPercent}%</span>
            <span className="practice-recommended__stat-label">Accuracy</span>
          </div>
          <div className="practice-recommended__stat">
            <span className="practice-recommended__stat-value">{recommended.attempts}</span>
            <span className="practice-recommended__stat-label">
              Attempt{recommended.attempts === 1 ? "" : "s"}
            </span>
          </div>
          <div className="practice-recommended__stat practice-recommended__stat--wide">
            <span className="practice-recommended__stat-value practice-recommended__stat-value--small">
              {recommended.lastPracticedLabel}
            </span>
          </div>
        </div>

        <div className="practice-recommended__progress" aria-label={`${recommended.accuracyPercent}% accuracy`}>
          <span className="practice-recommended__progress-pct">{recommended.accuracyPercent}%</span>
          <div
            className="practice-recommended__progress-track"
            role="progressbar"
            aria-valuenow={recommended.accuracyPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="practice-recommended__progress-fill"
              style={{ width: `${recommended.accuracyPercent}%` }}
            />
          </div>
        </div>

        <p className="practice-recommended__attention">
          <span className="material-symbols-outlined">priority_high</span>
          {recommended.attentionLabel}
        </p>

        <div className="practice-recommended__benefit">
          <span className="practice-recommended__benefit-label">{recommended.benefitLabel}</span>
          <p className="practice-recommended__benefit-detail">{recommended.benefitDetail}</p>
        </div>

        <ul className="practice-recommended__preview">
          {recommended.sessionPreview.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        <button
          type="button"
          className="btn primary btn-block practice-recommended__cta"
          disabled={busy}
          onClick={onStart}
        >
          {busy ? "Starting…" : recommended.ctaLabel}
          {!busy && <span className="material-symbols-outlined">arrow_forward</span>}
        </button>
      </div>
    </section>
  );
}
