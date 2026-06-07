import { Link } from "react-router-dom";
import type { ProgressSummary } from "../api";
import { subjectAccuracyLabel } from "../utils/analyticsInsights";
import { buildSubjectAccuracy } from "../utils/dashboardStats";
import { weakChapterBankUrl, weakChapterPracticeUrl } from "../utils/weakChapters";

type Props = {
  progress: ProgressSummary | null;
  defaultPackId?: string;
};

export default function AnalyticsWeakSubjectGrid({ progress, defaultPackId }: Props) {
  const weakChapters = progress?.weakChapters ?? [];
  const subjects = buildSubjectAccuracy(weakChapters);

  return (
    <div className="analytics-weak-subject-grid">
      <section className="analytics-card glass-card">
        <header className="analytics-card-head">
          <div className="analytics-card-icon">
            <span className="material-symbols-outlined">target</span>
          </div>
          <div>
            <h2>Weak chapters</h2>
            <p className="analytics-card-sub">Tap to practice or open in Question Bank</p>
          </div>
        </header>
        {weakChapters.length === 0 ? (
          <p className="analytics-empty">
            Answer questions in Practice to unlock chapter-level weak spots.
          </p>
        ) : (
          <ul className="analytics-weak-list">
            {weakChapters.slice(0, 5).map((c) => (
              <li key={`${c.subject}-${c.chapter}`} className="analytics-weak-row-wrap">
                <Link to={weakChapterPracticeUrl(c, defaultPackId)} className="analytics-weak-row">
                  <span className="analytics-weak-row__label">
                    {c.chapter} · {c.subject} · {c.accuracyPercent}%
                  </span>
                  <span className="material-symbols-outlined analytics-weak-row__arrow">arrow_forward</span>
                </Link>
                <Link to={weakChapterBankUrl(c)} className="analytics-weak-row__bank" title="Question Bank">
                  Bank
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="analytics-card glass-card">
        <header className="analytics-card-head">
          <div className="analytics-card-icon">
            <span className="material-symbols-outlined">bar_chart</span>
          </div>
          <div>
            <h2>Accuracy by subject</h2>
            <p className="analytics-card-sub">From your chapter attempts</p>
          </div>
        </header>
        <div className="analytics-subject-bars">
          {subjects.map((s) => {
            const attempted = s.attempts > 0;
            return (
              <div key={s.name} className={attempted ? "" : "analytics-subject-row-wrap--empty"}>
                <div className="analytics-subject-row">
                  <span>{s.name}</span>
                  <span className={attempted ? "" : "analytics-subject-row__empty"}>
                    {subjectAccuracyLabel(s)}
                  </span>
                </div>
                <div className="analytics-subject-track">
                  <div
                    className={`analytics-subject-fill${attempted ? "" : " analytics-subject-fill--empty"}`}
                    style={{ width: attempted ? `${s.pct}%` : "0%" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
