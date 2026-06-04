import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const TABS = [
  { to: "/", icon: "dashboard", label: "Dashboard" },
  { to: "/bank?exam=NEET", icon: "menu_book", label: "Practice" },
  { to: "/analytics", icon: "insights", label: "Analytics" },
  { to: "/practice", icon: "bolt", label: "Sessions" },
] as const;

export default function BottomNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const hidden =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.match(/^\/practice\/[^/]+\//);

  if (hidden) return null;

  const profileTo = user ? "/analytics" : "/login";

  function isActive(to: string) {
    if (to === "/") return pathname === "/";
    if (to.startsWith("/bank")) return pathname === "/bank" || pathname.startsWith("/pack/");
    if (to === "/analytics") return pathname === "/analytics";
    if (to === "/practice") return pathname === "/practice";
    return false;
  }

  return (
    <nav className="lumina-bottom-nav" aria-label="Mobile">
      {TABS.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          className={isActive(tab.to) ? "lumina-tab active" : "lumina-tab"}
        >
          <span className="material-symbols-outlined">{tab.icon}</span>
          <span>{tab.label}</span>
        </Link>
      ))}
      <Link to={profileTo} className={pathname === "/login" ? "lumina-tab active" : "lumina-tab"}>
        <span className="material-symbols-outlined">person</span>
        <span>Profile</span>
      </Link>
    </nav>
  );
}
