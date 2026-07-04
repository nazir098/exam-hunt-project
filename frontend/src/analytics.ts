type EventProps = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    plausible?: (event: string, options?: { props?: Record<string, unknown> }) => void;
  }
}

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() ?? "";
const PLAUSIBLE_DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN?.trim() ?? "";
const CF_TOKEN = import.meta.env.VITE_CF_WEB_ANALYTICS_TOKEN?.trim() ?? "";

let initialized = false;

function analyticsEnabled(): boolean {
  if (import.meta.env.VITE_ANALYTICS_ENABLED === "false") return false;
  if (import.meta.env.DEV && import.meta.env.VITE_ANALYTICS_ENABLED !== "true") return false;
  return Boolean(GA_ID || PLAUSIBLE_DOMAIN || CF_TOKEN);
}

function sanitizeProps(props?: EventProps): Record<string, string | number | boolean> {
  if (!props) return {};
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(props)) {
    if (value == null) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      out[key.slice(0, 64)] = typeof value === "string" ? value.slice(0, 256) : value;
    }
  }
  return out;
}

function injectScript(src: string, attrs?: Record<string, string>): void {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = src;
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      script.setAttribute(key, value);
    }
  }
  document.head.appendChild(script);
}

function initCloudflareBeacon(): void {
  if (!CF_TOKEN || document.querySelector("script[data-cf-beacon]")) return;
  const script = document.createElement("script");
  script.defer = true;
  script.src = "https://static.cloudflareinsights.com/beacon.min.js";
  script.setAttribute("data-cf-beacon", JSON.stringify({ token: CF_TOKEN }));
  document.head.appendChild(script);
}

function initGa4(): void {
  if (!GA_ID) return;
  injectScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { send_page_view: false, anonymize_ip: true });
}

function initPlausible(): void {
  if (!PLAUSIBLE_DOMAIN) return;
  injectScript("https://plausible.io/js/script.js", { "data-domain": PLAUSIBLE_DOMAIN });
}

export function initAnalytics(): void {
  if (initialized || !analyticsEnabled()) return;
  initialized = true;
  initCloudflareBeacon();
  initGa4();
  initPlausible();
}

export function setAnalyticsUser(userId: string | null): void {
  if (GA_ID && window.gtag) {
    window.gtag("config", GA_ID, { user_id: userId ?? undefined });
  }
}

export function trackPageView(path: string, title?: string): void {
  if (!initialized) return;
  const pageTitle = title ?? document.title;
  window.gtag?.("event", "page_view", {
    page_path: path,
    page_title: pageTitle,
    page_location: `${window.location.origin}${path}`,
  });
  window.plausible?.("pageview", { props: { path } });
  trackEvent("page_view", { path, title: pageTitle });
}

export function trackEvent(name: string, properties?: EventProps): void {
  if (!initialized) return;
  const safeName = name.trim().slice(0, 64);
  if (!safeName) return;
  const props = sanitizeProps(properties);
  window.gtag?.("event", safeName, props);
  window.plausible?.(safeName, { props });
}
