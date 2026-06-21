import { Link } from "react-router-dom";
import type { SubjectTile } from "../utils/bankSubjects";

type Props = {
  tiles: SubjectTile[];
  exam?: string;
  compact?: boolean;
};

export default function BankSubjectGrid({ tiles, exam = "NEET", compact = false }: Props) {
  return (
    <section
      className={`bank-subject-grid${compact ? " bank-subject-grid--compact" : ""}`}
      aria-label="Browse by subject"
    >
      {!compact && (
        <div className="bank-subject-grid__head">
          <h2 className="bank-subject-grid__title">Browse by subject</h2>
          <p className="bank-subject-grid__sub muted">Tap a subject to filter chapters and PYQs</p>
        </div>
      )}
      <div className="bank-subject-grid__cards">
        {tiles.map((tile) => (
          <Link
            key={tile.name}
            to={`/practice?exam=${exam}&subject=${encodeURIComponent(tile.querySubject)}#question-bank`}
            className="bank-subject-card glass-card"
          >
            <span className="material-symbols-outlined bank-subject-card__icon">{tile.icon}</span>
            <h3>{tile.name}</h3>
            <p>
              <strong>{tile.chapterCount}</strong> ch · <strong>{tile.questionCount}</strong> Q
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
