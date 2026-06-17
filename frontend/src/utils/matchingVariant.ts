import type { McqOptionView } from "../api";

const LIST_A_ITEM = /\b([A-D])\.\s*(.+?)(?=\s+[A-D]\.\s|$)/gis;
const ANSWER_MAPPING = /\b([A-D])\s*[-–:]\s*(.+?)(?=\s*,\s*[A-D]\s*[-–:]|$)/gis;

export type ParsedMatching = {
  intro: string;
  listA: McqOptionView[];
  listB: McqOptionView[];
};

function normalizeSpace(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return hash;
}

export function shuffleDeterministic(items: McqOptionView[], seed: string): McqOptionView[] {
  if (items.length <= 1) return items;
  const out = [...items];
  let state = hashSeed(seed) || 1;
  for (let i = out.length - 1; i > 0; i--) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    const j = state % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.map((item, idx) => ({ ...item, id: String(idx + 1) }));
}

export function parseListAFromText(questionText: string): McqOptionView[] {
  if (!questionText?.trim()) return [];
  const out: McqOptionView[] = [];
  for (const match of questionText.matchAll(LIST_A_ITEM)) {
    const id = match[1];
    const text = normalizeSpace(match[2] ?? "");
    if (text) out.push({ id, text });
  }
  return out;
}

export function parseIntroFromText(questionText: string): string {
  if (!questionText?.trim()) return "Match List-I with List-II";
  const match = LIST_A_ITEM.exec(questionText);
  LIST_A_ITEM.lastIndex = 0;
  if (match?.index != null && match.index > 0) {
    return questionText.slice(0, match.index).trim().replace(/[:\s]+$/, "");
  }
  const idx = questionText.toLowerCase().indexOf(" a.");
  if (idx > 0) {
    return questionText.slice(0, idx).trim().replace(/[:\s]+$/, "");
  }
  return "Match List-I with List-II";
}

function collectMappedValues(text: string, unique: Set<string>) {
  for (const match of text.matchAll(ANSWER_MAPPING)) {
    const body = normalizeSpace(match[2] ?? "");
    if (body) unique.add(body);
  }
}

export function parseListBPoolFromOptions(options: McqOptionView[] | undefined): McqOptionView[] {
  if (!options?.length) return [];
  const unique = new Set<string>();
  for (const opt of options) {
    collectMappedValues(opt.text ?? "", unique);
  }
  let index = 1;
  return [...unique].map((text) => ({ id: String(index++), text }));
}

export function listRomanLabel(index: number): string {
  const romans = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii"];
  return romans[index] ?? String(index + 1);
}

export function isMatchingVariant(
  variantType?: string | null,
  questionFormat?: string | null,
  matchListA?: McqOptionView[]
): boolean {
  const type = (variantType ?? "").trim().toLowerCase();
  const format = (questionFormat ?? "").trim().toLowerCase();
  return type === "matching" || format === "matching" || (matchListA?.length ?? 0) > 0;
}

export function resolveMatchingColumns(input: {
  questionId?: string;
  questionTextPreview?: string;
  variantType?: string | null;
  questionFormat?: string | null;
  options?: McqOptionView[];
  matchListA?: McqOptionView[];
  matchListB?: McqOptionView[];
}): ParsedMatching | null {
  if (!isMatchingVariant(input.variantType, input.questionFormat, input.matchListA)) {
    return null;
  }

  const listA =
    input.matchListA && input.matchListA.length > 0
      ? input.matchListA
      : parseListAFromText(input.questionTextPreview ?? "");

  if (listA.length === 0) return null;

  let listB =
    input.matchListB && input.matchListB.length > 0
      ? input.matchListB
      : parseListBPoolFromOptions(input.options);

  if ((!input.matchListB || input.matchListB.length === 0) && listB.length > 1) {
    const seed = input.questionId?.trim() || input.questionTextPreview || "matching";
    listB = shuffleDeterministic(listB, seed);
  }

  const intro =
    input.matchListA && input.matchListA.length > 0
      ? normalizeSpace(input.questionTextPreview ?? "") ||
        parseIntroFromText(input.questionTextPreview ?? "")
      : parseIntroFromText(input.questionTextPreview ?? "");

  return { intro, listA, listB };
}
