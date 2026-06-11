import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPracticeSession, fetchExams, fetchPacks, fetchQuestions, PackSummary } from "../api";
import { useAuth } from "../auth/AuthContext";
import ProductModeBanner from "../components/ProductModeBanner";
import AppLoader from "../components/AppLoader";
import TestSessionBuilder from "../components/TestSessionBuilder";
import TestSessionSummary from "../components/TestSessionSummary";
import {
  formatDifficultyParam,
  formatDifficultySessionParam,
  type DifficultyLevel,
} from "../utils/difficultyFilter";
import {
  bankDisplayPacks,
  clampPracticeQuestionCount,
  estimatedTestMinutes,
  pickDefaultPack,
  recentTestSessions,
} from "../utils/practiceHub";
import { sessionRoute } from "../navigation/modes";

export default function TestCreatePage() {
  const { user, loading: authLoading, progress } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [packId, setPackId] = useState(searchParams.get("packId") || "");
  const [subject, setSubject] = useState(searchParams.get("subject") || "");
  const [chapter, setChapter] = useState(searchParams.get("chapter") || "");
  const [difficulties, setDifficulties] = useState<DifficultyLevel[]>([]);
  const [questionCount, setQuestionCount] = useState(45);
  const [poolMax, setPoolMax] = useState(0);
  const [poolLoading, setPoolLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([fetchPacks(), fetchExams()])
      .then(([p]) => {
        setPacks(p);
        if (!packId) {
          const def = pickDefaultPack(bankDisplayPacks(p))?.packId || "";
          if (def) setPackId(def);
        }
      })
      .catch((e) => setError(e.message));
  }, [packId]);

  const practicePacks = bankDisplayPacks(packs);
  const selectedPack = practicePacks.find((p) => p.packId === packId);

  useEffect(() => {
    if (!packId) {
      setPoolMax(0);
      return;
    }
    let cancelled = false;
    setPoolLoading(true);
    fetchQuestions(packId, {
      subject: subject || undefined,
      chapter: chapter || undefined,
      difficulty: formatDifficultyParam(difficulties),
      page: 0,
      size: 1,
    })
      .then((res) => {
        if (!cancelled) setPoolMax(res.totalElements);
      })
      .catch(() => {
        if (!cancelled) setPoolMax(0);
      })
      .finally(() => {
        if (!cancelled) setPoolLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [packId, subject, chapter, difficulties]);

  const sessionSize = useMemo(() => {
    if (poolMax <= 0) return 0;
    return clampPracticeQuestionCount(questionCount, poolMax);
  }, [questionCount, poolMax]);
  const estMinutes = useMemo(
    () => estimatedTestMinutes(sessionSize, subject || undefined),
    [sessionSize, subject]
  );
  const recentTests = useMemo(
    () => (user ? recentTestSessions(progress?.recentSessions ?? [], 4) : []),
    [user, progress?.recentSessions]
  );

  useEffect(() => {
    if (poolMax <= 0) return;
    setQuestionCount((c) => clampPracticeQuestionCount(c, poolMax));
  }, [poolMax]);

  async function startTest(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      navigate(`/login?next=${encodeURIComponent("/test/create")}`);
      return;
    }
    if (!packId) {
      setError("Select a pack to build your test.");
      return;
    }
    if (poolMax <= 0 || sessionSize <= 0) {
      setError("No questions match these filters. Try Mixed difficulty or broader scope.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const session = await createPracticeSession({
        exam: "NEET",
        packId,
        subject: subject || undefined,
        chapter: chapter || undefined,
        difficulty: formatDifficultySessionParam(difficulties),
        adaptive: false,
        mode: "test",
        questionCount: sessionSize,
      });
      const qId = session.currentQuestionId;
      if (!qId) throw new Error("Test has no questions for these filters.");
      navigate(sessionRoute("test", session.id, qId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create test");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) {
    return (
      <main className="dashboard-page test-create-page pt-4 lg:pt-6">
        <ProductModeBanner mode="test" />
        <section className="glass-card content-loader-panel">
          <AppLoader
            variant="inline"
            label="Loading test builder…"
            hint="Preparing question packs"
            mode="test"
            icon="edit_note"
          />
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-page test-create-page pt-4 lg:pt-6">
      <ProductModeBanner mode="test" />
      <header className="test-create-page__head">
        <h1 className="practice-page-title">Prepare your test</h1>
        <p className="practice-page-desc">
          Build a timed NEET-style test. Scores feed analytics and weak-area detection — not the
          leaderboard.
        </p>
      </header>

      <div className="practice-session-row">
        <TestSessionBuilder
          packId={packId}
          subject={subject}
          chapter={chapter}
          difficulties={difficulties}
          questionCount={questionCount}
          sessionSize={sessionSize}
          poolMax={poolMax}
          poolLoading={poolLoading}
          estMinutes={estMinutes}
          packs={practicePacks}
          selectedPack={selectedPack}
          busy={busy}
          error={error}
          onPackId={setPackId}
          onSubject={setSubject}
          onChapter={setChapter}
          onDifficulties={setDifficulties}
          onQuestionCount={setQuestionCount}
          onSubmit={startTest}
        />

        <TestSessionSummary recentTests={recentTests} packs={practicePacks} />
      </div>
    </main>
  );
}
