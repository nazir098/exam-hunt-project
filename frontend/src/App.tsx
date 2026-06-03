import { Route, Routes } from "react-router-dom";
import SiteLayout from "./components/SiteLayout";
import BrowsePage from "./pages/BrowsePage";
import QuestionPage from "./pages/QuestionPage";

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<BrowsePage />} />
        <Route path="/pack/:packId" element={<BrowsePage />} />
        <Route path="/question/:questionId" element={<QuestionPage />} />
      </Route>
    </Routes>
  );
}
