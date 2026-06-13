/** Build text for AiMarkdown preview — wraps bare LaTeX in $ delimiters. */
export function latexPreviewText(raw: string, mode: "markdown" | "formula" = "markdown"): string {
  const text = raw.trim();
  if (!text) return "";
  if (mode === "formula") {
    if (text.includes("$")) return text;
    return `$${text}$`;
  }
  return text;
}
