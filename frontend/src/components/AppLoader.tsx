export type AppLoaderMode = "default" | "practice" | "test";

type Props = {
  label?: string;
  hint?: string;
  variant?: "inline" | "compact";
  mode?: AppLoaderMode;
  icon?: string;
};

export default function AppLoader({
  label = "Loading…",
  hint,
  variant = "inline",
  mode = "default",
  icon = "auto_awesome",
}: Props) {
  return (
    <div
      className={`app-loader app-loader--${variant} app-loader--${mode}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="app-loader__orb" aria-hidden="true">
        <div className="app-loader__ring" />
        <div className="app-loader__ring app-loader__ring--inner" />
        <div className="app-loader__core">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
      </div>
      <p className="app-loader__label">{label}</p>
      {hint && <p className="app-loader__hint">{hint}</p>}
    </div>
  );
}
