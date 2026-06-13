import { BANK_MODE_HINT, PRACTICE_MODE_HINT, TEST_MODE_HINT } from "./modeHints";

export type SiteNavItem = {
  to: string;
  label: string;
  icon: string;
  match: (pathname: string) => boolean;
  disabled?: boolean;
  /** Shown on hover (nav links). */
  hint?: string;
};

export const SITE_NAV: SiteNavItem[] = [
  { to: "/", label: "Dashboard", icon: "dashboard", match: (p) => p === "/" },
  {
    to: "/bank?exam=NEET",
    label: "Question Bank",
    icon: "menu_book",
    match: (p) =>
      p === "/bank" || p.startsWith("/pack/") || p.startsWith("/question/") || p.startsWith("/solve/"),
    hint: BANK_MODE_HINT,
  },
  {
    to: "/practice",
    label: "Practice",
    icon: "bolt",
    match: (p) => p === "/practice" || !!p.match(/^\/practice\/[^/]+\//),
    hint: PRACTICE_MODE_HINT,
  },
  {
    to: "/test/create",
    label: "Test",
    icon: "assignment",
    match: (p) => p === "/test/create" || !!p.match(/^\/test\/session\//),
    hint: TEST_MODE_HINT,
  },
  { to: "/analytics", label: "Analytics", icon: "insights", match: (p) => p === "/analytics" },
  {
    to: "/leaderboard",
    label: "Leaderboard",
    icon: "emoji_events",
    match: (p) => p === "/leaderboard",
  },
];

export const MOBILE_BOTTOM_NAV = SITE_NAV.filter((item) => !item.disabled && item.to);
