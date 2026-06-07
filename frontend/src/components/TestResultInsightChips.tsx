import type { ChapterProgress } from "../api";
import { insightChipsFromLines, type InsightChip } from "../utils/sessionResultInsights";

type Props = {
  insights: string[];
  weakChapters: ChapterProgress[];
};

function chipClass(kind: InsightChip["kind"]): string {
  return `test-result-insight test-result-insight--${kind}`;
}

export default function TestResultInsightChips({ insights, weakChapters }: Props) {
  const chips = insightChipsFromLines(insights, weakChapters);
  if (chips.length === 0) return null;

  return (
    <section className="glass-card test-result-insights" aria-label="AI insights">
      <header className="test-result-insights__head">
        <span className="material-symbols-outlined">auto_awesome</span>
        <h2 className="session-result-section__title">AI insights</h2>
      </header>
      <ul className="test-result-insights__list">
        {chips.map((chip) => (
          <li key={`${chip.kind}-${chip.text}`} className={chipClass(chip.kind)}>
            <span className="test-result-insight__icon material-symbols-outlined">{chip.icon}</span>
            <div className="test-result-insight__body">
              <span className="test-result-insight__label">{chip.label}</span>
              <p className="test-result-insight__text">{chip.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
