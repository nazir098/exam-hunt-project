import { MODES, type ProductMode } from "../navigation/modes";

type Props = {
  mode: ProductMode;
  compact?: boolean;
  /** Slim pill for sticky headers — minimal vertical space. */
  inline?: boolean;
  /** Study mode: twin green pills (Study mode + No rank pressure). */
  split?: boolean;
};

const INLINE_ICONS: Record<ProductMode, string> = {
  solve: "menu_book",
  practice: "school",
  test: "timer",
};

const INLINE_LABELS: Record<ProductMode, string> = {
  solve: "Study",
  practice: "Practice",
  test: "Test",
};

const INLINE_HINTS: Record<ProductMode, string> = {
  solve: "no rank pressure",
  practice: "instant feedback",
  test: "exam simulation",
};

export default function ProductModeBanner({ mode, compact, inline, split }: Props) {
  const meta = MODES[mode];

  if (split && mode === "solve") {
    return (
      <div className="product-mode-banner-twin" role="group" aria-label="Study mode">
        <span className="product-mode-badge product-mode-badge--study">
          <span className="material-symbols-outlined" aria-hidden>
            menu_book
          </span>
          Study mode
        </span>
        <span className="product-mode-badge product-mode-badge--calm">
          <span className="material-symbols-outlined" aria-hidden>
            shield
          </span>
          No rank pressure
        </span>
      </div>
    );
  }

  if (inline) {
    return (
      <span
        className={`product-mode-chip product-mode-chip--${mode}`}
        title={meta.helper}
        aria-label={`${meta.label}: ${meta.helper}`}
      >
        <span className="material-symbols-outlined product-mode-chip__icon" aria-hidden>
          {INLINE_ICONS[mode]}
        </span>
        <span className="product-mode-chip__label">{INLINE_LABELS[mode]}</span>
        <span className="product-mode-chip__hint hidden sm:inline">· {INLINE_HINTS[mode]}</span>
      </span>
    );
  }

  return (
    <div className={`product-mode-banner product-mode-banner--${mode}${compact ? " product-mode-banner--compact" : ""}`}>
      <span className="product-mode-banner__label">{meta.label}</span>
      {!compact && <p className="product-mode-banner__helper">{meta.helper}</p>}
      {mode === "practice" && (
        <span className="product-mode-banner__tag product-mode-banner__tag--rank">Improve</span>
      )}
      {mode === "test" && (
        <span className="product-mode-banner__tag product-mode-banner__tag--self">Evaluate</span>
      )}
      {mode === "solve" && (
        <span className="product-mode-banner__tag product-mode-banner__tag--calm">No rank pressure</span>
      )}
    </div>
  );
}
