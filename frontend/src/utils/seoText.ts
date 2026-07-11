const ASSET_MARKER = /\{\{asset:\d+\}\}/g;
const LATEX_COMMAND = /\\[a-zA-Z]+\{([^}]*)\}/g;
const MATH_DELIM = /\$+/g;
const MARKDOWN = /\*\*/g;
const WHITESPACE = /\s+/g;

export function seoPlainText(raw?: string | null): string {
  if (!raw?.trim()) return "";
  let text = raw.trim();
  text = text.replace(ASSET_MARKER, " ");
  text = text.replace(LATEX_COMMAND, "$1");
  text = text.replace(MATH_DELIM, " ");
  text = text.replace(/[_^{}\\]/g, " ");
  text = text.replace(MARKDOWN, "");
  text = text.replace(WHITESPACE, " ").trim();
  return text;
}

export function seoExcerpt(raw: string | null | undefined, maxLen: number): string {
  const plain = seoPlainText(raw);
  if (plain.length <= maxLen) return plain;
  return `${plain.slice(0, Math.max(0, maxLen - 3)).trim()}...`;
}
