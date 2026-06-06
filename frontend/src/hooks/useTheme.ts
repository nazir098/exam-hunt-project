import { useEffect, useState } from "react";
import { applyTheme, getSystemTheme, getStoredTheme, storeTheme, type Theme } from "../utils/theme";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme() ?? getSystemTheme());

  useEffect(() => {
    applyTheme(theme);
    storeTheme(theme);
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    function onChange() {
      if (getStoredTheme() == null) {
        setTheme(mq.matches ? "dark" : "light");
      }
    }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function toggle() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  return { theme, setTheme, toggle, isDark: theme === "dark" };
}
