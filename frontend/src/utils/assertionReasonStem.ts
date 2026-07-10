export type ParsedAssertionReasonStem = {
  intro: string;
  first: string;
  second: string;
  outro: string;
  firstLabel: string;
  secondLabel: string;
  kind: "assertion_reason" | "statement_pair";
};

const OUTRO_RE =
  /\bIn\s+(?:the\s+)?light\s+of\s+(?:the\s+)?above\s+statements?\b[\s\S]*$/i;

const SECOND_MARKER_RE =
  /\b(?:Reason\s*\(\s*R\s*\)|Reason|Statement\s*I(?:I|l))\s*[.:]\s*/gi;

const FIRST_MARKERS: {
  re: RegExp;
  firstLabel: string;
  secondLabel: string;
  kind: ParsedAssertionReasonStem["kind"];
}[] = [
  {
    re: /\bAssertion\s*\(\s*A\s*\)\s*[.:]\s*/gi,
    firstLabel: "Assertion (A)",
    secondLabel: "Reason (R)",
    kind: "assertion_reason",
  },
  {
    re: /\bStatement\s*I\s*[.:]\s*/gi,
    firstLabel: "Statement I",
    secondLabel: "Statement II",
    kind: "statement_pair",
  },
  {
    re: /\bAssertion\s*[.:]\s*/gi,
    firstLabel: "Assertion (A)",
    secondLabel: "Reason (R)",
    kind: "assertion_reason",
  },
];

function findLastMatch(text: string, re: RegExp): RegExpExecArray | null {
  const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
  const matcher = new RegExp(re.source, flags);
  let last: RegExpExecArray | null = null;
  for (const match of text.matchAll(matcher)) {
    last = match;
  }
  return last;
}

/** Detect NEET assertion–reason / statement I–II stems embedded in a single text field. */
export function parseAssertionReasonStem(text: string): ParsedAssertionReasonStem | null {
  const raw = text?.trim();
  if (!raw) return null;
  if (!/\b(?:Statement\s*I|Assertion\s*\(|Assertion\s*[.:]|Reason\s*\()/i.test(raw)) {
    return null;
  }

  let outro = "";
  let body = raw;
  const outroMatch = OUTRO_RE.exec(raw);
  if (outroMatch?.index != null) {
    outro = outroMatch[0].trim();
    body = raw.slice(0, outroMatch.index).trim();
  }

  const secondMatch = findLastMatch(body, SECOND_MARKER_RE);
  if (secondMatch?.index == null) return null;

  const beforeSecond = body.slice(0, secondMatch.index);
  const second = body.slice(secondMatch.index + secondMatch[0].length).trim();
  if (!second) return null;

  let firstMatch: RegExpExecArray | null = null;
  let meta = FIRST_MARKERS[0];
  for (const candidate of FIRST_MARKERS) {
    const match = findLastMatch(beforeSecond, candidate.re);
    if (match) {
      firstMatch = match;
      meta = candidate;
      break;
    }
  }
  if (!firstMatch) return null;

  const first = beforeSecond.slice(firstMatch.index + firstMatch[0].length).trim();
  if (!first) return null;

  let { firstLabel, secondLabel, kind } = meta;
  if (/Statement\s*I(?:I|l)\s*[.:]/i.test(secondMatch[0])) {
    kind = "statement_pair";
    firstLabel = "Statement I";
    secondLabel = "Statement II";
  }

  return {
    intro: beforeSecond.slice(0, firstMatch.index).trim(),
    first,
    second,
    outro,
    firstLabel,
    secondLabel,
    kind,
  };
}

export function stemLooksLikeAssertionReason(text?: string | null): boolean {
  return Boolean(text?.trim() && parseAssertionReasonStem(text));
}
