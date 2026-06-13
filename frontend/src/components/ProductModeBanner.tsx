import { MODES, type ProductMode } from "../navigation/modes";

type Props = {
  mode: ProductMode;
  compact?: boolean;
};

export default function ProductModeBanner({ mode, compact }: Props) {
  const meta = MODES[mode];
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
