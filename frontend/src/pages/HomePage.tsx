import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPacks, PackSummary } from "../api";

export default function HomePage() {
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPacks()
      .then(setPacks)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="muted">Loading exams…</p>;
  if (error) {
    return (
      <div className="card error-card">
        <h2>Could not load catalog</h2>
        <p>{error}</p>
        <p className="hint">
          Start the API on port 8081 and import manifests from pdf-qa-extractor (see README).
        </p>
      </div>
    );
  }

  if (!packs.length) {
    return (
      <div className="card">
        <h2>No exams yet</h2>
        <p className="muted">
          Import a published manifest:{" "}
          <code>POST /api/admin/import/folder/2016</code>
        </p>
      </div>
    );
  }

  return (
    <div className="pack-grid">
      {packs.map((p) => (
        <Link key={p.packId} to={`/pack/${p.packId}`} className="card pack-card">
          <h2>
            {p.exam} {p.year}
          </h2>
          <p className="muted">{p.questionCount} questions</p>
          {p.facets?.subjects?.slice(0, 3).map((s) => (
            <span key={s.name} className="pill">
              {s.name} ({s.count})
            </span>
          ))}
        </Link>
      ))}
    </div>
  );
}
