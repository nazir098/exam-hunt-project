export type ParsedBankSearch = {
  year?: number;
  questionNo?: number;
  text: string;
};

const YEAR_RE = /\b(20(?:1[6-9]|2[0-9]|3[0-5]))\b/;
const Q_NO_RE = /\b(?:q(?:uestion)?\.?\s*#?|#)(\d{1,3})\b/i;

/** Split a bank search box query into year, paper Q number, and free text. */
export function parseBankSearchQuery(raw: string): ParsedBankSearch {
  let text = raw.trim();
  if (!text) return { text: "" };

  let year: number | undefined;
  let questionNo: number | undefined;

  const yearMatch = text.match(YEAR_RE);
  if (yearMatch) {
    year = Number(yearMatch[1]);
    text = text.replace(yearMatch[0], " ").trim();
  }

  const qNoMatch = text.match(Q_NO_RE);
  if (qNoMatch) {
    questionNo = Number(qNoMatch[1]);
    text = text.replace(qNoMatch[0], " ").trim();
  } else if (!year && /^\d{1,3}$/.test(text)) {
    questionNo = Number(text);
    text = "";
  }

  text = text.replace(/\s+/g, " ").trim();
  return { year, questionNo, text };
}

export function describeBankSearch(parsed: ParsedBankSearch, raw: string): string {
  const parts: string[] = [];
  if (parsed.year) parts.push(`Year ${parsed.year}`);
  if (parsed.questionNo) parts.push(`Q${parsed.questionNo}`);
  if (parsed.text) parts.push(`“${parsed.text}”`);
  if (parts.length === 0) return raw;
  return parts.join(" · ");
}

export const BANK_SEARCH_EXAMPLES = [
  { label: "2024", value: "2024" },
  { label: "Optics", value: "Optics" },
  { label: "Q45", value: "Q45" },
] as const;
