import { Navigate, Route, Routes } from "react-router-dom";
import SiteLayout from "./components/SiteLayout";
import BrowsePage from "./pages/BrowsePage";
import AnalyticsPage from "./pages/AnalyticsPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import PracticePage from "./pages/PracticePage";
import PracticeQuestionPage from "./pages/PracticeQuestionPage";
import QuestionPage from "./pages/QuestionPage";
import RegisterPage from "./pages/RegisterPage";
import AdminPage from "./pages/AdminPage";
import AdminQuestionEditorPage from "./pages/AdminQuestionEditorPage";
import RevisionPage from "./pages/RevisionPage";
import TestCreatePage from "./pages/TestCreatePage";
import WrongAttemptsPage from "./pages/WrongAttemptsPage";
import SessionResultPage from "./pages/SessionResultPage";
import TestReviewPage from "./pages/TestReviewPage";

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/revision" element={<RevisionPage />} />
        <Route path="/bank" element={<BrowsePage />} />
        <Route path="/pack/:packId" element={<BrowsePage />} />
        <Route path="/solve/:questionId" element={<QuestionPage />} />
        <Route path="/question/:questionId" element={<QuestionPage />} />
        <Route path="/practice" element={<PracticePage />} />
        <Route path="/practice/result/:sessionId" element={<SessionResultPage mode="practice" />} />
        <Route path="/practice/:sessionId/:questionId" element={<PracticeQuestionPage />} />
        <Route path="/test/create" element={<TestCreatePage />} />
        <Route path="/test/result/:sessionId/review" element={<TestReviewPage />} />
        <Route path="/test/result/:sessionId" element={<SessionResultPage mode="test" />} />
        <Route path="/test/session/:sessionId/:questionId" element={<PracticeQuestionPage />} />
        <Route path="/review/wrong-attempts" element={<WrongAttemptsPage />} />
        <Route path="/ai-tutor" element={<Navigate to="/analytics" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/questions" element={<AdminQuestionEditorPage />} />
        <Route path="/admin/questions/:questionId" element={<AdminQuestionEditorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
