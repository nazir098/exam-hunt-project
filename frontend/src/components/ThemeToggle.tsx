import { useTheme } from "../hooks/useTheme";

type Props = {
  className?: string;
};

export default function ThemeToggle({ className = "" }: Props) {
  const { isDark, toggle } = useTheme();

  return (
    <button
      type="button"
      className={`theme-toggle stitch-theme-toggle${className ? ` ${className}` : ""}`}
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <span className="material-symbols-outlined" aria-hidden>
        {isDark ? "light_mode" : "dark_mode"}
      </span>
    </button>
  );
}
