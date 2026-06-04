import { Link, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  BRAND_NAME,
  STITCH_AVATAR_ANALYTICS,
  STITCH_AVATAR_BANK,
  STITCH_AVATAR_DETAIL,
  STITCH_AVATAR_HOME,
} from "../design/stitchAssets";

type Props = {
  children: ReactNode;
  showAiBar?: boolean;
  showFab?: boolean;
  fabIcon?: "chat_bubble" | "smart_toy";
};

const MOBILE_TABS = [
  { to: "/", icon: "dashboard", label: "Dashboard", match: (p: string) => p === "/" },
  { to: "/bank?exam=NEET", icon: "menu_book", label: "Practice", match: (p: string) => p === "/bank" || p.startsWith("/pack/") },
  { to: null as string | null, icon: "psychology", label: "AI Tutor" },
  { to: "/analytics", icon: "insights", label: "Analytics", match: (p: string) => p === "/analytics" },
] as const;

function avatarFor(pathname: string): string {
  if (pathname.startsWith("/question/")) return STITCH_AVATAR_DETAIL;
  if (pathname === "/bank" || pathname.startsWith("/pack/")) return STITCH_AVATAR_BANK;
  if (pathname === "/analytics") return STITCH_AVATAR_ANALYTICS;
  return STITCH_AVATAR_HOME;
}

export default function StitchShell({
  children,
  showAiBar = false,
  showFab = true,
  fabIcon = "chat_bubble",
}: Props) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const avatar = avatarFor(pathname);
  const isDetail = pathname.startsWith("/question/");
  const isBank = pathname === "/bank" || pathname.startsWith("/pack/");
  const isAnalytics = pathname === "/analytics";
  const isHome = pathname === "/";
  const profileTo = user ? "/analytics" : "/login";

  const navClass =
    "bg-surface-glass backdrop-blur-md border-b border-white/10 shadow-md flex justify-between items-center w-full px-margin-mobile h-16 z-50 sticky top-0 shrink-0";

  return (
    <div className="flex flex-col min-h-[100dvh] flex-1">
      <header className={navClass}>
        {isDetail ? (
          <>
            <div className="flex items-center gap-sm">
              <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center overflow-hidden border border-primary/20">
                <img alt="" className="stitch-avatar-lg" src={avatar} />
              </div>
              <Link to="/" className="stitch-logo">
                {BRAND_NAME}
              </Link>
            </div>
            <button type="button" className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/5" disabled>
              <span className="material-symbols-outlined text-primary">smart_toy</span>
            </button>
          </>
        ) : isAnalytics ? (
          <>
            <div className="flex items-center gap-md">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/30">
                <img alt="" className="stitch-avatar-lg" src={avatar} />
              </div>
              <Link to="/" className="stitch-logo">
                {BRAND_NAME}
              </Link>
            </div>
            <button type="button" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 text-primary" disabled>
              <span className="material-symbols-outlined">smart_toy</span>
            </button>
          </>
        ) : (
          <>
            <Link to="/" className="stitch-logo">
              {BRAND_NAME}
            </Link>
            <div className="flex items-center gap-md">
              <span className="material-symbols-outlined text-primary">smart_toy</span>
              <Link to={profileTo} className="block rounded-full overflow-hidden" style={{ border: "1px solid rgba(138,43,226,0.2)" }}>
                <img alt="" className="stitch-avatar" src={avatar} />
              </Link>
            </div>
          </>
        )}
      </header>

      <div className="flex-1">{children}</div>

      {!showAiBar && (
        <nav className="sticky bottom-0 z-50 flex justify-around items-center px-2 pb-2 h-20 bg-surface-container-high/90 backdrop-blur-xl border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] rounded-t-xl shrink-0">
          {MOBILE_TABS.map((tab) => {
            const active = "match" in tab && tab.match(pathname);
            const cls = active
              ? "flex flex-col items-center justify-center text-primary bg-primary-container/20 rounded-xl px-3 py-1 scale-90 transition-all duration-200"
              : "flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-all px-3 py-1";
            if (tab.to) {
              return (
                <Link key={tab.label} to={tab.to} className={cls}>
                  <span
                    className="material-symbols-outlined"
                    style={active && isHome && tab.to === "/" ? { fontVariationSettings: "'FILL' 1" } : active && tab.to.includes("bank") && isBank ? { fontVariationSettings: "'FILL' 1" } : active && tab.to === "/analytics" && isAnalytics ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {tab.icon}
                  </span>
                  <span className="text-label-md font-label-md">{tab.label}</span>
                </Link>
              );
            }
            return (
              <button key={tab.label} type="button" className={cls} disabled>
                <span className="material-symbols-outlined">{tab.icon}</span>
                <span className="text-label-md font-label-md">{tab.label}</span>
              </button>
            );
          })}
          <Link to={profileTo} className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-all px-3 py-1">
            <span className="material-symbols-outlined">person</span>
            <span className="text-label-md font-label-md">Profile</span>
          </Link>
        </nav>
      )}

      {showFab && !showAiBar && (
        <button
          type="button"
          className={`absolute z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95 right-6 bottom-24 pointer-events-none opacity-90 ${
            fabIcon === "smart_toy" ? "electric-glow-bg shadow-primary-container/40" : "electric-glow"
          }`}
          disabled
        >
          <span className={`material-symbols-outlined ${fabIcon === "smart_toy" ? "text-white text-3xl" : "text-[28px]"}`} style={fabIcon === "chat_bubble" ? { fontVariationSettings: "'FILL' 1" } : undefined}>
            {fabIcon}
          </span>
        </button>
      )}

      {showAiBar && (
        <div className="sticky bottom-0 z-40 bg-surface-container-high/90 backdrop-blur-xl border-t border-white/10 shadow-[0_-10px_30px_rgba(0,0,0,0.4)] shrink-0">
          <div className="px-margin-mobile h-24 flex items-center justify-between gap-md">
            <div className="flex items-center gap-sm flex-1">
              <button type="button" className="flex-1 px-md py-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-on-surface" disabled>
                <span className="material-symbols-outlined text-primary">lightbulb</span>
                <span className="font-label-md">AI Hint</span>
              </button>
              <button type="button" className="flex-1 px-md py-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-on-surface" disabled>
                <span className="material-symbols-outlined text-primary">psychology</span>
                <span className="font-label-md">AI Explain</span>
              </button>
            </div>
            <button type="button" className="w-14 h-14 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shadow-lg ai-glow shrink-0" disabled>
              <span className="material-symbols-outlined">chat</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
