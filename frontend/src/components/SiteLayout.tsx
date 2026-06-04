import { Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  createPracticeSession,
  fetchPacks,
  fetchQuestions,
} from "../api";
import { browsePathFromPack, filterQuestionsForPractice } from "../utils/practice";
import StitchShell from "./StitchShell";
import StitchViewport from "./StitchViewport";

export default function SiteLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [practiceBusy, setPracticeBusy] = useState(false);
  const { user } = useAuth();

  const isBank = pathname === "/bank" || pathname.startsWith("/pack/");
  const isQuestionDetail = pathname.startsWith("/question/");
  const showAiBar = isQuestionDetail;

  async function startPracticeFromBank() {
    if (practiceBusy) return;
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(pathname + "?" + searchParams.toString())}`);
      return;
    }
    setPracticeBusy(true);
    try {
      const packMatch = pathname.match(/^\/pack\/([^/]+)/);
      let packId = packMatch?.[1] || searchParams.get("packId") || "";
      if (!packId) {
        const packs = await fetchPacks();
        const year = searchParams.get("year");
        if (year) packId = packs.find((p) => String(p.year) === year)?.packId || "";
        packId = packId || packs[0]?.packId || "";
      }
      if (!packId) {
        navigate("/bank?exam=NEET");
        return;
      }
      const res = await fetchQuestions(packId, {
        subject: searchParams.get("subject") || undefined,
        chapter: searchParams.get("chapter") || undefined,
        page: 0,
        size: 300,
      });
      const filtered = filterQuestionsForPractice(res.content, {
        topic: searchParams.get("topic") || undefined,
        difficulty: searchParams.get("difficulty") || undefined,
        q: searchParams.get("q") || undefined,
      });
      if (filtered.length === 0) {
        navigate(browsePathFromPack(packId, searchParams.toString()));
        return;
      }
      const session = await createPracticeSession({
        exam: searchParams.get("exam") || "NEET",
        packId,
        subject: searchParams.get("subject") || undefined,
        chapter: searchParams.get("chapter") || undefined,
        topic: searchParams.get("topic") || undefined,
        difficulty: searchParams.get("difficulty") || undefined,
        adaptive: true,
      });
      const qId = session.currentQuestionId;
      if (!qId) throw new Error("No questions");
      navigate(`/practice/${session.id}/${qId}`);
    } catch {
      navigate(isBank ? browsePathFromPack(searchParams.get("packId") || "", searchParams.toString()) : "/bank?exam=NEET");
    } finally {
      setPracticeBusy(false);
    }
  }

  const isAnalytics = pathname === "/analytics";
  const hideChrome =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    !!pathname.match(/^\/practice\/[^/]+\//);

  if (hideChrome) {
    return (
      <div className="legacy-ui min-h-[100dvh]">
        <Outlet context={{ startPracticeFromBank, practiceBusy }} />
      </div>
    );
  }

  return (
    <StitchViewport>
      <StitchShell
        showAiBar={showAiBar}
        showFab={!isQuestionDetail}
        fabIcon={isAnalytics ? "smart_toy" : "chat_bubble"}
      >
        <Outlet context={{ startPracticeFromBank, practiceBusy }} />
      </StitchShell>
    </StitchViewport>
  );
}
