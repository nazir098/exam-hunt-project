import { Link, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import DesktopSiteFooter from "./DesktopSiteFooter";
import DesktopSiteHeader from "./DesktopSiteHeader";
import MobileSiteHeader from "./MobileSiteHeader";
import { MOBILE_BOTTOM_NAV } from "../navigation/siteNav";

type Props = {
  children: ReactNode;
};

export default function StitchShell({ children }: Props) {
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const isBankBrowse =
    pathname === "/practice" || pathname === "/bank" || pathname.startsWith("/pack/");
  const isAnalytics = pathname === "/analytics";
  const isPracticeSession = !!pathname.match(/^\/practice\/[^/]+\//);
  const isLeaderboard = pathname === "/leaderboard";

  return (
    <div className="flex flex-col min-h-[100dvh] flex-1 stitch-shell">
      <DesktopSiteHeader />
      <MobileSiteHeader />

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
                  active && (isHome || isBankBrowse || isAnalytics || isPracticeSession || isLeaderboard)
                    ? { fontVariationSettings: "'FILL' 1" }
                    : undefined
                }
              >
                {tab.icon}
              </span>
              <span className="text-[10px] font-label-md leading-tight text-center truncate max-w-[4.5rem]">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
