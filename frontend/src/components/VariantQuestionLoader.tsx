type Props = {
  label?: string;
};

export default function VariantQuestionLoader({ label = "" }: Props) {
  const status = label.trim()
    ? `Generating ${label.toLowerCase()}…`
    : "Generating variation…";

  return (
    <div className="variant-llm-loader" role="status" aria-live="polite" aria-busy="true">
      <div className="variant-llm-loader__glow" aria-hidden />
      <div className="variant-llm-loader__head">
        <span className="material-symbols-outlined variant-llm-loader__icon">auto_awesome</span>
        <span className="variant-llm-loader__status">{status}</span>
      </div>
      <div className="variant-llm-loader__body">
        <span className="variant-llm-loader__shimmer variant-llm-loader__shimmer--lg" />
        <span className="variant-llm-loader__shimmer" />
        <span className="variant-llm-loader__shimmer variant-llm-loader__shimmer--md" />
        <span className="variant-llm-loader__shimmer variant-llm-loader__shimmer--sm" />
        <div className="variant-llm-loader__grid">
          <span className="variant-llm-loader__chip" />
          <span className="variant-llm-loader__chip" />
          <span className="variant-llm-loader__chip" />
          <span className="variant-llm-loader__chip" />
        </div>
      </div>
    </div>
  );
}
