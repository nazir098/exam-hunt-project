import { Link } from "react-router-dom";
import type { SessionResultView } from "../api";
import { formatPackLabel } from "../utils/practiceHub";

type Props = {
  result: SessionResultView;
};

function retakeTestUrl(session: SessionResultView["session"]): string {
  const params = new URLSearchParams({ packId: session.packId });
  if (session.filterSubject?.trim()) params.set("subject", session.filterSubject.trim());
  if (session.filterChapter?.trim()) params.set("chapter", session.filterChapter.trim());
  return `/test/create?${params.toString()}`;
}

function retakeDescription(session: SessionResultView["session"]): string {
  const pack = formatPackLabel(session.packId);
  const scope = session.filterChapter
    ? session.filterChapter
    : session.filterSubject
      ? `${session.filterSubject} only`
      : "Full mixed paper";
  return `${pack} · ${scope} · ${session.questionCount} questions — run it again under timed conditions.`;
}

function analyticsDescription(result: SessionResultView): string {
  const weak = result.weakChaptersInSession[0];
  if (weak) {
    return `${result.accuracyPercent}% accuracy this test · drill ${weak.chapter} (${weak.accuracyPercent}%) in heatmaps and trends.`;
  }
  if (result.wrongAttempts.length > 0) {
    return `Review ${result.wrongAttempts.length} missed question${result.wrongAttempts.length === 1 ? "" : "s"} with subject and weekly heatmaps.`;
  }
  return "Track accuracy, weak chapters, and practice rhythm over time.";
}

export default function TestResultFollowUp({ result }: Props) {
  const { session } = result;
  const retakeHref = retakeTestUrl(session);

  return (
    <section className="glass-card test-result-followup" aria-label="Keep improving">
      <header className="test-result-followup__head">
        <span className="material-symbols-outlined">bolt</span>
        <h2 className="session-result-section__title">Keep improving</h2>
      </header>

      <div className="test-result-followup__grid">
        <Link to={retakeHref} className="test-result-followup__card">
          <span className="material-symbols-outlined test-result-followup__icon">replay</span>
          <div className="test-result-followup__copy">
            <strong>Retake this test</strong>
            <p>{retakeDescription(session)}</p>
          </div>
          <span className="material-symbols-outlined test-result-followup__arrow">chevron_right</span>
        </Link>

        <Link to="/analytics" className="test-result-followup__card">
          <span className="material-symbols-outlined test-result-followup__icon test-result-followup__icon--analytics">
            insights
          </span>
          <div className="test-result-followup__copy">
            <strong>Open Analytics</strong>
            <p>{analyticsDescription(result)}</p>
          </div>
          <span className="material-symbols-outlined test-result-followup__arrow">chevron_right</span>
        </Link>
      </div>
    </section>
  );
}
