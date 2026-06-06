type Props = {
  text: string;
  className?: string;
};

/** Small (i) icon — instant tooltip on hover/focus via CSS `data-tooltip`. */
export default function HintTooltip({ text, className = "" }: Props) {
  return (
    <span
      className={`hover-hint hover-hint--icon ${className}`}
      data-tooltip={text}
      tabIndex={0}
      aria-label={text}
    >
      <span className="material-symbols-outlined hover-hint__icon" aria-hidden>
        tips_and_updates
      </span>
    </span>
  );
}
