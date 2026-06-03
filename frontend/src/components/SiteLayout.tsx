import { Link, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ExamCatalogEntry, fetchExams } from "../api";
import { EXAM_PILLS, findExam } from "../utils/exams";

export default function SiteLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [catalog, setCatalog] = useState<ExamCatalogEntry[]>([]);

  const isBrowse = pathname === "/" || pathname.startsWith("/pack/");
  const isPractice = pathname.startsWith("/question/");
  const searchQuery = searchParams.get("q") || "";
  const activeExam = searchParams.get("exam") || "NEET";

  useEffect(() => {
    fetchExams().then(setCatalog).catch(() => setCatalog([]));
  }, []);

  function setExam(examId: string) {
    const next = new URLSearchParams(searchParams);
    next.set("exam", examId);
    next.set("page", "0");
    if (examId !== "NEET") {
      next.delete("year");
      next.delete("subject");
      next.delete("chapter");
      next.delete("topic");
    }
    const base = pathname.startsWith("/pack/") ? pathname : "/";
    navigate(`${base}?${next.toString()}`);
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header-row site-header-row--top">
          <Link to="/?exam=NEET" className="site-brand">
            <span className="site-brand-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
                <path d="M22 10v6" />
                <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
              </svg>
            </span>
            <span>
              <span className="site-brand-title">Exam Hunt</span>
              <span className="site-brand-sub">NEET PYQ practice</span>
            </span>
          </Link>

          <div className="site-mode-tabs">
            <Link
              to="/?exam=NEET"
              className={isBrowse && !isPractice ? "mode-tab active" : "mode-tab"}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 7v14M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
              </svg>
              <span className="mode-tab-label">Browse</span>
            </Link>
            <span className="mode-tab disabled" title="Open a question to practice">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
              </svg>
              <span className="mode-tab-label">Practice</span>
            </span>
          </div>
        </div>

        <div className="site-header-row site-header-row--search">
          <form
            className="site-search"
            onSubmit={(e) => {
              e.preventDefault();
              const q = new FormData(e.currentTarget).get("q") as string;
              const next = new URLSearchParams(searchParams);
              if (q.trim()) next.set("q", q.trim());
              else next.delete("q");
              next.set("page", "0");
              if (!next.get("exam")) next.set("exam", "NEET");
              navigate(`${pathname.startsWith("/pack/") ? pathname : "/"}?${next.toString()}`);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              name="q"
              type="search"
              placeholder="Search NEET topic, chapter…"
              defaultValue={searchQuery}
              enterKeyHint="search"
            />
          </form>
        </div>

        <div className="site-exam-pills-scroll">
          <div className="site-exam-pills">
            {EXAM_PILLS.map(({ id, label }) => {
              const entry = findExam(catalog, id);
              const comingSoon = entry?.status === "coming_soon";
              return (
                <button
                  key={id}
                  type="button"
                  className={
                    activeExam === id
                      ? comingSoon
                        ? "exam-pill active coming-soon-pill"
                        : "exam-pill active"
                      : comingSoon
                        ? "exam-pill coming-soon-pill"
                        : "exam-pill"
                  }
                  onClick={() => setExam(id)}
                >
                  {label}
                  {comingSoon && <span className="pill-soon">Soon</span>}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <Outlet />
    </div>
  );
}
