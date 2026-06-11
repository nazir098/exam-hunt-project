import AiMarkdown from "./AiMarkdown";
import { latexPreviewText } from "../utils/latexPreview";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  /** formula = wrap bare LaTeX in $...$ for preview */
  previewMode?: "markdown" | "formula";
  compact?: boolean;
};

export default function AdminLatexField({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
  previewMode = "markdown",
  compact = false,
}: Props) {
  const preview = latexPreviewText(value, previewMode);

  return (
    <label className="admin-latex-field">
      <span className="admin-latex-field__label">{label}</span>
      <div className="admin-latex-field__stack">
        <textarea
          className={`admin-latex-field__input${compact ? " admin-latex-field__input--compact" : ""}`}
          rows={rows}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {preview ? (
          <div className="admin-latex-field__preview" aria-live="polite">
            <span className="admin-latex-field__preview-tag">Rendered preview</span>
            <AiMarkdown text={preview} className="ai-markdown--paper" />
          </div>
        ) : (
          <p className="admin-latex-field__preview-empty muted">Preview appears as you type LaTeX or markdown.</p>
        )}
      </div>
    </label>
  );
}
