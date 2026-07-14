import type { McqOptionView } from "../api";

export type ParsedLetterStatements = {
  intro: string;
  statements: McqOptionView[];
};

const LETTER_MARKER = /(?:^|\n)([A-Z])\.\s*/g;

/** Parse NEET "A. … B. … C. …" statement blocks embedded in a single stem field. */
export function parseLetterStatementsStem(text: string): ParsedLetterStatements | null {
  const raw = text?.trim();
  if (!raw) return null;

  const matches = [...raw.matchAll(LETTER_MARKER)];
  if (matches.length < 3) return null;

  const ids = matches.map((m) => m[1]);
  if (new Set(ids).size !== ids.length) return null;

  const intro = raw
    .slice(0, matches[0].index ?? 0)
    .trim()
    .replace(/[:\s]+$/, "");

  const stopAt = (chunk: string) => {
    const cut = chunk.search(
      /(?:^|\n)(?:Choose\b|\(\s*1\s*\)|['"]?[A-Z]['"]?\s+is\s*:)/i
    );
    return (cut >= 0 ? chunk.slice(0, cut) : chunk).trim();
  };

  const statements: McqOptionView[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = (matches[i].index ?? 0) + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index ?? raw.length : raw.length;
    const body = stopAt(raw.slice(start, end));
    if (body) {
      statements.push({ id: matches[i][1], text: body });
    }
  }

  if (statements.length < 3) return null;
  return { intro, statements };
}

export function statementsLookValid(statements: McqOptionView[]): boolean {
  if (statements.length < 2) return false;
  const letterIds = statements.every((s) => /^[A-Z]$/i.test(s.id.trim()));
  if (!letterIds) {
    return statements.every((s) => s.text.trim().length > 0);
  }
  return statements.every((s) => !/\s+[B-Z]\.\s*/i.test(s.text));
}

export function sortStatements(statements: McqOptionView[]): McqOptionView[] {
  return [...statements].sort((a, b) => {
    const ai = a.id.trim();
    const bi = b.id.trim();
    if (/^[A-Z]$/i.test(ai) && /^[A-Z]$/i.test(bi)) {
      return ai.localeCompare(bi);
    }
    const an = Number(ai);
    const bn = Number(bi);
    if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
    return ai.localeCompare(bi);
  });
}

export function statementDisplayLabel(stmt: McqOptionView, index: number, total: number): string {
  const id = stmt.id?.trim() ?? "";
  if (/^[A-Z]$/.test(id)) return id;
  if (/^[IVX]+$/i.test(id)) return id.toUpperCase();
  if (total <= 4) {
    return ["I", "II", "III", "IV", "V"][index] ?? String(index + 1);
  }
  return String(index + 1);
}

export function stemLooksLikeLetterStatements(text?: string | null): boolean {
  return Boolean(text?.trim() && parseLetterStatementsStem(text));
}
