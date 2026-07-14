import type { McqOptionView } from "../api";

const LIST_A_ITEM = /\b([A-D])\.\s*(.+?)(?=\s+[A-D]\.\s|$)/gis;
const ANSWER_MAPPING = /\b([A-D])\s*[-–:]\s*(.+?)(?=\s*,\s*[A-D]\s*[-–:]|$)/gis;
/** 4-col MinerU: | A. | item | I. | item | */
const MATCHING_TABLE_ROW_4 =
  /^\|\s*([A-D])\.?\s*\|\s*([^|]+?)\s*\|\s*(?:\(?([IVX]+)\)?\.?)\s*\|\s*([^|]+?)\s*\|/i;
/** 2-col MinerU: | A. item | I. item | */
const MATCHING_TABLE_ROW_2 =
  /^\|\s*([A-D])\.\s*([^|]+?)\s*\|\s*(?:\(?([IVX]+)\)?\.?)\s*([^|]+?)\s*\|/i;
const CHOOSE_OPTIONS = /\bChoose the correct answer\b/i;

export type ParsedMatching = {
  intro: string;
  listA: McqOptionView[];
  listB: McqOptionView[];
};

function normalizeSpace(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function romanOrder(id: string): number {
  const order: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };
  return order[id.toUpperCase()] ?? 99;
}

function sortListB(items: McqOptionView[]): McqOptionView[] {
  return [...items].sort((a, b) => romanOrder(a.id) - romanOrder(b.id));
}

/** Parse MinerU markdown tables: | A. | List-I item | I. | List-II item | */
export function parseMatchingTableStem(text: string): ParsedMatching | null {
  const raw = text?.trim();
  if (!raw || !raw.includes("|")) return null;

  const listA: McqOptionView[] = [];
  const listB: McqOptionView[] = [];

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    const match = MATCHING_TABLE_ROW_4.exec(trimmed) ?? MATCHING_TABLE_ROW_2.exec(trimmed);
    if (!match) continue;
    const idA = match[1].toUpperCase();
    const textA = normalizeSpace(match[2]);
    const idB = match[3].toUpperCase();
    const textB = normalizeSpace(match[4]);
    // Skip subtitle/header cells like "(Example)" / "(Type of Solution)"
    if (/^\([^)]+\)$/.test(textA) && /^\([^)]+\)$/.test(textB)) continue;
    if (textA) listA.push({ id: idA, text: textA });
    if (textB) listB.push({ id: idB, text: textB });
  }

  if (listA.length < 3 || listB.length < 3) return null;

  const tableStart = raw.search(/^\s*\|/m);
  let intro = tableStart > 0 ? raw.slice(0, tableStart).trim() : "Match List-I with List-II";
  intro = intro.replace(/[.\s]+$/, "").trim();
  if (!intro) intro = "Match List-I with List-II";

  return {
    intro,
    listA,
    listB: sortListB(listB),
  };
}

export function stemLooksLikeMatchingTable(text?: string | null): boolean {
  return Boolean(text?.trim() && parseMatchingTableStem(text));
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

  const table = parseMatchingTableStem(questionText);
  if (table) return table.intro;

  const chooseIdx = questionText.search(CHOOSE_OPTIONS);
  const scoped = chooseIdx >= 0 ? questionText.slice(0, chooseIdx) : questionText;

  const match = LIST_A_ITEM.exec(scoped);
  LIST_A_ITEM.lastIndex = 0;
  if (match?.index != null && match.index > 0) {
    return scoped.slice(0, match.index).trim().replace(/[:\s]+$/, "");
  }
  const idx = scoped.toLowerCase().indexOf(" a.");
  if (idx > 0) {
    return scoped.slice(0, idx).trim().replace(/[:\s]+$/, "");
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

/** Prefer PDF/table ids (I, II, …) so List-II lines up with option keys A-III. */
export function listBDisplayLabel(item: McqOptionView, index: number): string {
  const id = (item.id ?? "").trim();
  if (/^[IVXLCDM]+$/i.test(id)) {
    return `${id.toUpperCase()}.`;
  }
  return `(${listRomanLabel(index)}).`;
}

export function isMatchingVariant(
  variantType?: string | null,
  questionFormat?: string | null,
  matchListA?: McqOptionView[],
  questionText?: string | null
): boolean {
  const type = (variantType ?? "").trim().toLowerCase();
  const format = (questionFormat ?? "").trim().toLowerCase();
  return (
    type === "matching" ||
    format === "matching" ||
    (matchListA?.length ?? 0) > 0 ||
    stemLooksLikeMatchingTable(questionText)
  );
}

export function matchingListsLookValid(
  listA: McqOptionView[] | undefined,
  listB?: McqOptionView[]
): boolean {
  if (!listA || listA.length < 3) return false;
  if (
    listA.some(
      (item) =>
        /\s+[IVX]{1,4}\.\s+/i.test(item.text) ||
        /choose the correct answer/i.test(item.text)
    )
  ) {
    return false;
  }
  if (listB?.some((item) => /^[IVX]+$/i.test(item.text.trim()))) {
    return false;
  }
  return true;
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
  const text = input.questionTextPreview ?? "";
  if (!isMatchingVariant(input.variantType, input.questionFormat, input.matchListA, text)) {
    return null;
  }

  const tableParsed = parseMatchingTableStem(text);
  if (tableParsed) {
    return tableParsed;
  }

  const useApiLists =
    input.matchListA &&
    input.matchListA.length > 0 &&
    matchingListsLookValid(input.matchListA, input.matchListB);

  const listA = useApiLists ? input.matchListA! : parseListAFromText(text);

  if (listA.length === 0) return null;

  let listB =
    useApiLists && input.matchListB && input.matchListB.length > 0
      ? input.matchListB
      : parseListBPoolFromOptions(input.options);

  if (!useApiLists && (!input.matchListB || input.matchListB.length === 0) && listB.length > 1) {
    const seed = input.questionId?.trim() || text || "matching";
    listB = shuffleDeterministic(listB, seed);
  }

  const intro = parseIntroFromText(text);

  return { intro, listA, listB };
}
