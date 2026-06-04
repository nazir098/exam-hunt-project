import { Link } from "react-router-dom";
import type { SubjectTile } from "../utils/bankSubjects";

type Props = {
  tiles: SubjectTile[];
  exam?: string;
};

export default function BankSubjectGrid({ tiles, exam = "NEET" }: Props) {
  return (
    <section className="bank-subject-grid" aria-label="Browse by subject">
      <div className="bank-subject-grid__head">
        <h2 className="bank-subject-grid__title">Browse by subject</h2>
        <p className="bank-subject-grid__sub muted">Tap a subject to filter chapters and PYQs</p>
      </div>
      <div className="bank-subject-grid__cards">
        {tiles.map((tile) => (
          <Link
            key={tile.name}
            to={`/bank?exam=${exam}&subject=${encodeURIComponent(tile.querySubject)}`}
            className="bank-subject-card glass-card"
          >
            <span className="material-symbols-outlined bank-subject-card__icon">{tile.icon}</span>
            <h3>{tile.name}</h3>
            <p>
              <strong>{tile.chapterCount}</strong> chapters · <strong>{tile.questionCount}</strong>{" "}
              questions
            </p>
            <span className="bank-subject-card__cta">
              Explore <span className="material-symbols-outlined">arrow_forward</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
