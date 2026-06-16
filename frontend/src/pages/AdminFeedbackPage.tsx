import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  fetchAdminQuestionFeedback,
  type AdminFeedbackRow,
} from "../api";
import { useAuth } from "../auth/AuthContext";

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  wrong_answer: "Wrong answer",
  typo: "Typo",
  image_issue: "Image issue",
  ai_variant: "AI variant",
  other: "Other",
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function questionLabel(row: AdminFeedbackRow) {
  const variant =
    row.variantNo > 0 ? ` · V${row.variantNo}` : "";
  return `${row.exam} ${row.year} · Q${row.questionNo}${variant}${row.subject ? ` · ${row.subject}` : ""}`;
}

export default function AdminFeedbackPage() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<AdminFeedbackRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [filterQid, setFilterQid] = useState("");
  const [appliedFilter, setAppliedFilter] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!user?.admin) return;
    setBusy(true);
    setError(null);
    fetchAdminQuestionFeedback({
      questionId: appliedFilter || undefined,
      page,
      size: 25,
    })
      .then((res) => {
        setRows(res.items);
        setTotalPages(res.totalPages);
        setTotal(res.total);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Could not load feedback");
        setRows([]);
      })
      .finally(() => setBusy(false));
  }, [user?.admin, page, appliedFilter]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <main className="stitch-page admin-page"><p className="muted">Loading…</p></main>;
  }

  if (!user?.admin) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="stitch-page admin-page admin-feedback-page">
      <header className="admin-page__hero">
        <div>
          <p className="text-caption text-on-surface-variant uppercase tracking-wide">Administrator</p>
          <h1 className="text-headline text-on-surface">Question feedback</h1>
          <p className="text-body-sm text-on-surface-variant mt-2 max-w-xl">
            Ratings and reports submitted by students. {total > 0 ? `${total} total.` : ""}
          </p>
        </div>
        <div className="admin-feedback-page__nav">
          <Link to="/admin" className="btn">
            Admin home
          </Link>
        </div>
      </header>

      <form
        className="admin-feedback-page__filter"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(0);
          setAppliedFilter(filterQid.trim());
        }}
      >
        <label className="admin-feedback-page__filter-label">
          <span className="text-body-sm text-on-surface-variant">Question ID</span>
          <input
            className="admin-page__input"
            value={filterQid}
            onChange={(e) => setFilterQid(e.target.value)}
            placeholder="NEET_2016_Q42"
          />
        </label>
        <button type="submit" className="btn primary">
          Filter
        </button>
        {appliedFilter && (
          <button
            type="button"
            className="btn"
            onClick={() => {
              setFilterQid("");
              setAppliedFilter("");
              setPage(0);
            }}
          >
            Clear
          </button>
        )}
      </form>

      {error && <p className="admin-page__folder-hint admin-page__folder-hint--error">{error}</p>}

      {busy ? (
        <p className="muted">Loading feedback…</p>
      ) : rows.length === 0 ? (
        <p className="muted">No feedback yet.</p>
      ) : (
        <div className="admin-feedback-table-wrap">
          <table className="admin-feedback-table">
            <thead>
              <tr>
                <th>When</th>
                <th>User</th>
                <th>Question</th>
                <th>Rating</th>
                <th>Report</th>
                <th>Feedback</th>
                <th>Context</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="admin-feedback-table__when">{formatDate(row.ratedAt)}</td>
                  <td className="admin-feedback-table__user">{row.userEmail}</td>
                  <td className="admin-feedback-table__question">
                    <Link to={`/solve/${encodeURIComponent(row.questionId)}`}>
                      {questionLabel(row)}
                    </Link>
                    <span className="admin-feedback-table__qid muted">{row.questionId}</span>
                  </td>
                  <td>{row.score > 0 ? `${row.score} ★` : "—"}</td>
                  <td>{CATEGORY_LABELS[row.category ?? "general"] ?? row.category ?? "—"}</td>
                  <td className="admin-feedback-table__comment">
                    {row.comment?.trim() ? row.comment : <span className="muted">—</span>}
                  </td>
                  <td>{row.context ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="admin-feedback-page__pager">
          <button
            type="button"
            className="btn"
            disabled={page <= 0 || busy}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </button>
          <span className="muted">
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            className="btn"
            disabled={page >= totalPages - 1 || busy}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}
