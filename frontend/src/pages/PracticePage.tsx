import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createPracticeSession,
  fetchPacks,
  type QuestionSetMode,
} from "../api";
import { useAuth } from "../auth/AuthContext";
import PracticeRecentSessions from "../components/PracticeRecentSessions";
import QuestionBankSection, { type BankSessionStart } from "../components/QuestionBankSection";
import { DEMO_SESSIONS } from "../utils/analyticsPreview";
import {
  activeSession,
  bankDisplayPacks,
  clampPracticeQuestionCount,
  pickDefaultPack,
  practicePoolMax,
  sessionResumeUrl,
} from "../utils/practiceHub";
import { meaningfulSessions } from "../utils/dashboardStats";

export default function PracticePage() {
  const { user, progress, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isGuest = !user && !authLoading;
  const sessions = useMemo(
    () => (isGuest ? DEMO_SESSIONS : meaningfulSessions(progress?.recentSessions ?? [])),
    [isGuest, progress?.recentSessions]
  );
  const resume = useMemo(() => (user ? activeSession(progress) : null), [user, progress]);
  const resumeUrl = resume ? sessionResumeUrl(resume) : null;

  const startQuick = useCallback(
    async (opts: {
      packId?: string;
      subject?: string;
      chapter?: string;
      topic?: string;
      difficulty?: string;
      adaptive?: boolean;
      questionCount?: number;
      questionSet?: QuestionSetMode;
    }) => {
      if (!user) {
        navigate(`/login?next=${encodeURIComponent("/practice")}`);
        return;
      }
      const packs = bankDisplayPacks(await fetchPacks());
      const pid = opts.packId || pickDefaultPack(packs)?.packId;
      if (!pid) {
        setError("Import NEET packs first (Admin) or check your connection.");
        return;
      }
      const pack = packs.find((p) => p.packId === pid);
      const subj = opts.subject;
      const ch = opts.chapter;
      const setMode = opts.questionSet ?? "pyq";
      const count = clampPracticeQuestionCount(
        opts.questionCount ?? 20,
        practicePoolMax(pack, subj, ch, setMode)
      );
      setBusy(true);
      setError("");
      try {
        const session = await createPracticeSession({
          exam: "NEET",
          packId: pid,
          subject: subj,
          chapter: ch,
          topic: opts.topic,
          difficulty: opts.difficulty,
          adaptive: opts.adaptive ?? true,
          mode: "practice",
          questionCount: count,
          questionSet: setMode,
        });
        const qId = session.currentQuestionId;
        if (!qId) throw new Error("Session has no questions");
        navigate(`/practice/${session.id}/${qId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start session");
      } finally {
        setBusy(false);
      }
    },
    [user, navigate]
  );

  const startFromBank = useCallback(
    (opts: BankSessionStart) => {
      startQuick({
        packId: opts.packId,
        subject: opts.subject,
        chapter: opts.chapter,
        topic: opts.topic,
        difficulty: opts.difficulty,
        questionCount: opts.questionCount,
        adaptive: opts.adaptive ?? true,
      });
    },
    [startQuick]
  );

  return (
    <main className="dashboard-page practice-page practice-page--hub pt-4 lg:pt-6 space-y-lg">
      <header className="practice-hub-hero practice-hub-hero--compact glass-card">
        <div className="practice-hub-hero__text">
          <h1 className="practice-page-title">Practice &amp; Question Bank</h1>
          <p className="practice-page-desc">
            Find questions, choose session size, and start practice.
          </p>
          {isGuest && (
            <div className="practice-hub-hero__auth">
              <Link to="/register?next=%2Fpractice" className="btn primary btn-sm">
                Get started
              </Link>
              <Link to="/login?next=%2Fpractice" className="btn btn-sm">
                Sign in
              </Link>
              <span className="practice-hub-hero__auth-hint muted">
                Browse free · sign in to save progress
              </span>
            </div>
          )}
          <nav className="practice-page-quick-links" aria-label="Related tools">
            <Link to="/test/create" className="practice-page-quick-links__item">
              <span className="material-symbols-outlined" aria-hidden>
                note_add
              </span>
              Add to test
            </Link>
            <Link to="/review/wrong-attempts" className="practice-page-quick-links__item">
              <span className="material-symbols-outlined" aria-hidden>
                history
              </span>
              Review wrong attempts
            </Link>
            <Link to="/analytics" className="practice-page-quick-links__item">
              <span className="material-symbols-outlined" aria-hidden>
                monitoring
              </span>
              Analytics
            </Link>
          </nav>
        </div>
        <div className="practice-hub-hero__badge" aria-hidden>
          <span className="material-symbols-outlined">menu_book</span>
        </div>
      </header>

      {error && !busy && <p className="error-text practice-hub-error">{error}</p>}

      <QuestionBankSection
        onStartSession={startFromBank}
        sessionBusy={busy}
        resumeSession={resume}
        resumeUrl={resumeUrl}
      />

      <PracticeRecentSessions
        sessions={sessions}
        busy={busy}
        guestPreview={isGuest}
        onPracticeAgain={(pid) => startQuick({ packId: pid, adaptive: true })}
      />
    </main>
  );
}
