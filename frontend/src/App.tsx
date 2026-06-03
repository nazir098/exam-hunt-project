import { Link, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import PackPage from "./pages/PackPage";
import QuestionPage from "./pages/QuestionPage";

export default function App() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <Link to="/" className="brand">
          <span className="brand-mark">N</span>
          <span>Neetlu</span>
        </Link>
        <p className="tagline">Previous year questions — browse &amp; practice</p>
      </header>
      <main className="site-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/pack/:packId" element={<PackPage />} />
          <Route path="/question/:questionId" element={<QuestionPage />} />
        </Routes>
      </main>
    </div>
  );
}
