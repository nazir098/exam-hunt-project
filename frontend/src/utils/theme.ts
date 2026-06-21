export type Theme = "light" | "dark";

const STORAGE_KEY = "exam-hunt-theme";

export function getStoredTheme(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "dark" || v === "light" ? v : null;
  } catch {
    return null;
  }
}

export function getSystemTheme(): Theme {
  return "dark";
}

export function resolveTheme(): Theme {
  return "dark";
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = theme === "dark" ? "#111125" : "#f5f4fa";
}

export function storeTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

/** Call once before React mounts (see index.html). */
export function initTheme() {
  applyTheme("dark");
  storeTheme("dark");
}
