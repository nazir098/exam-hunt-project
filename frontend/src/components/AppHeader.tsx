import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const NAV = [
  { to: "/", label: "Dashboard", match: (p: string) => p === "/" },
  { to: "/bank?exam=NEET", label: "Practice", match: (p: string) => p === "/bank" || p.startsWith("/pack/") },
  { to: "/practice", label: "Practice", match: (p: string) => p === "/practice" },
  { to: "/analytics", label: "Analytics", match: (p: string) => p === "/analytics" },
] as const;

export default function AppHeader() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const hideDesktopNav = pathname.startsWith("/question/") || pathname.match(/^\/practice\/[^/]+\//);

  return (
    <header className="lumina-header">
      <Link to="/" className="lumina-logo">
        Neetlu
      </Link>

      {!hideDesktopNav && (
        <nav className="lumina-header-nav" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={item.match(pathname) ? "lumina-nav-link active" : "lumina-nav-link"}
            >
              {item.label}
            </Link>
          ))}
          <span className="lumina-nav-link disabled">AI Tutor</span>
        </nav>
      )}

      <div className="lumina-header-actions">
        <button type="button" className="lumina-icon-btn" title="AI assistant (soon)" disabled>
          <span className="material-symbols-outlined">smart_toy</span>
        </button>
        {user ? (
          <Link to="/analytics" className="lumina-avatar" title={user.displayName || user.email}>
            <span>{(user.displayName || user.email).charAt(0).toUpperCase()}</span>
          </Link>
        ) : (
          <Link to="/login" className="lumina-sign-in">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
