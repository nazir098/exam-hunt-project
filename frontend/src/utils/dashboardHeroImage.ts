import {
  STITCH_ANALYTICS_HERO,
  STITCH_AVATAR_ANALYTICS,
  STITCH_AVATAR_BANK,
  STITCH_AVATAR_HOME,
  STITCH_PYQ_HERO,
} from "../design/stitchAssets";

export type DashboardHeroImage = {
  src: string;
  label: string;
};

/** Decorative hero art for the dashboard welcome panel — rotated so repeat visits feel fresh. */
export const DASHBOARD_HERO_IMAGES: DashboardHeroImage[] = [
  { src: STITCH_ANALYTICS_HERO, label: "Molecular biology" },
  { src: STITCH_PYQ_HERO, label: "NEET question practice" },
  { src: STITCH_AVATAR_ANALYTICS, label: "Performance analytics" },
  { src: STITCH_AVATAR_HOME, label: "Study dashboard" },
  { src: STITCH_AVATAR_BANK, label: "Question bank" },
];

function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (Math.imul(31, h) + value.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Stable per user per day, with optional visit offset so repeat loads cycle the pool. */
export function pickDashboardHeroImage(seed = "", visitOffset = 0): DashboardHeroImage {
  const base = hashString(`${seed}:${todayKey()}`);
  const index = (base + visitOffset) % DASHBOARD_HERO_IMAGES.length;
  return DASHBOARD_HERO_IMAGES[index]!;
}

const VISIT_KEY = "dashboard-hero-visit-index";

export function pickDashboardHeroImageForVisit(seed = ""): DashboardHeroImage {
  let offset = 0;
  try {
    offset = Number(sessionStorage.getItem(VISIT_KEY) ?? 0);
    sessionStorage.setItem(VISIT_KEY, String(offset + 1));
  } catch {
    /* private mode */
  }
  return pickDashboardHeroImage(seed, offset);
}
