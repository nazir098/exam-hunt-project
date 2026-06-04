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
import AiTutorPage from "./pages/AiTutorPage";
import RevisionPage from "./pages/RevisionPage";

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/ai-tutor" element={<AiTutorPage />} />
        <Route path="/revision" element={<RevisionPage />} />
        <Route path="/bank" element={<BrowsePage />} />
        <Route path="/pack/:packId" element={<BrowsePage />} />
        <Route path="/question/:questionId" element={<QuestionPage />} />
        <Route path="/practice" element={<PracticePage />} />
        <Route path="/practice/:sessionId/:questionId" element={<PracticeQuestionPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
