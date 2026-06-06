import { Link, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import DesktopSiteFooter from "./DesktopSiteFooter";
import DesktopSiteHeader from "./DesktopSiteHeader";
import {
  BRAND_NAME,
  STITCH_AVATAR_ANALYTICS,
  STITCH_AVATAR_BANK,
  STITCH_AVATAR_DETAIL,
  STITCH_AVATAR_HOME,
} from "../design/stitchAssets";
import { MOBILE_BOTTOM_NAV } from "../navigation/siteNav";

type Props = {
  children: ReactNode;
};

function avatarFor(pathname: string): string {
  if (pathname.startsWith("/question/")) return STITCH_AVATAR_DETAIL;
  if (pathname === "/bank" || pathname.startsWith("/pack/")) return STITCH_AVATAR_BANK;
  if (pathname === "/analytics") return STITCH_AVATAR_ANALYTICS;
  return STITCH_AVATAR_HOME;
}

export default function StitchShell({ children }: Props) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const avatar = avatarFor(pathname);
  const isDetail = pathname.startsWith("/question/");
  const isBank = pathname === "/bank" || pathname.startsWith("/pack/");
  const isAnalytics = pathname === "/analytics";
  const isHome = pathname === "/";
  const isPractice =
    pathname === "/practice" || !!pathname.match(/^\/practice\/[^/]+\//);
  const isLeaderboard = pathname === "/leaderboard";
  const bankSearchTo = "/bank?exam=NEET";

  const mobileNavClass =
    "lg:hidden bg-surface-glass backdrop-blur-md border-b border-white/10 shadow-md flex justify-between items-center w-full px-margin-mobile z-50 sticky top-0 shrink-0";
  const mobileNavStyle = { height: "var(--app-header-h)", minHeight: "var(--app-header-h)" } as const;

  return (
    <div className="flex flex-col min-h-[100dvh] flex-1 stitch-shell">
      <DesktopSiteHeader />

      <header className={mobileNavClass} style={mobileNavStyle}>
        {isDetail ? (
          <>
            <div className="flex items-center gap-sm min-w-0">
              <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center overflow-hidden border border-primary/20 shrink-0">
                <img alt="" className="stitch-avatar-lg" src={avatar} />
              </div>
              <Link to="/" className="stitch-logo truncate">
                {BRAND_NAME}
              </Link>
            </div>
            <div className="flex items-center gap-sm shrink-0">
              <Link to={bankSearchTo} className="stitch-mobile-icon-link" title="Search">
                <span className="material-symbols-outlined">search</span>
              </Link>
            </div>
          </>
        ) : isAnalytics ? (
          <>
            <div className="flex items-center gap-md min-w-0">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/30 shrink-0">
                <img alt="" className="stitch-avatar-lg" src={avatar} />
              </div>
              <Link to="/" className="stitch-logo truncate">
                {BRAND_NAME}
              </Link>
            </div>
            <div className="flex items-center gap-sm shrink-0">
              <Link to={bankSearchTo} className="stitch-mobile-icon-link" title="Search">
                <span className="material-symbols-outlined">search</span>
              </Link>
            </div>
          </>
        ) : (
          <>
            <Link to="/" className="stitch-logo shrink-0">
              {BRAND_NAME}
            </Link>
            <div className="flex items-center gap-sm min-w-0">
              <Link to={bankSearchTo} className="stitch-mobile-icon-link" title="Search question bank">
                <span className="material-symbols-outlined">search</span>
              </Link>
              <Link
                to={user ? "/analytics" : "/login"}
                className="block rounded-full overflow-hidden shrink-0"
                style={{ border: "1px solid rgba(138,43,226,0.2)" }}
                title={user?.displayName || "Account"}
              >
                <img alt="" className="stitch-avatar" src={avatar} />
              </Link>
            </div>
          </>
        )}
      </header>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="stitch-page-content flex-1">{children}</div>
        <DesktopSiteFooter />
      </div>

      <nav className="mobile-bottom-nav lg:hidden" aria-label="Mobile">
        {MOBILE_BOTTOM_NAV.map((tab) => {
          const active = tab.match(pathname);
          const cls = active
            ? "flex flex-col items-center justify-center text-primary bg-primary-container/20 rounded-xl px-2 py-1 scale-90 transition-all duration-200 min-w-0"
            : "flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-all px-2 py-1 min-w-0";
          return (
            <Link
              key={tab.to}
              to={tab.to}
              data-tooltip={tab.hint || undefined}
              className={`${cls}${tab.hint ? " nav-tip nav-tip--below" : ""}`}
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={
                  active && (isHome || isBank || isAnalytics || isPractice || isLeaderboard)
                    ? { fontVariationSettings: "'FILL' 1" }
                    : undefined
                }
              >
                {tab.icon}
              </span>
              <span className="text-[10px] font-label-md leading-tight text-center truncate max-w-[4.5rem]">
                {tab.label === "Question Bank" ? "Bank" : tab.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
