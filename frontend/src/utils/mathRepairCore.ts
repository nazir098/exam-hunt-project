/** Shared low-level LaTeX repair (mirrors backend MathRepairCore). */

export function collapseOverEscapedBackslashes(text: string): string {
  let t = text;
  let prev = "";
  while (t !== prev) {
    prev = t;
    t = t.replace(/\\\\([a-zA-Z])/g, "\\$1");
  }
  return t;
}

export function repairJsonEscapedLatex(text: string): string {
  let t = text.replace(/\u000c/g, "");
  t = t.replace(/-rac\{/g, "-\\frac{");
  t = t.replace(/-rac(?=\{)/g, "-\\frac");
  t = t.replace(/(?<![\\a-zA-Z])rac\{/g, "\\frac{");
  t = t.replace(/\u0009imes/g, "\\times");
  t = t.replace(/\u0009ext\{/g, "\\text{");
  t = t.replace(/\u0009heta/g, "\\theta");
  t = t.replace(/\u0009au/g, "\\tau");
  t = t.replace(/\u0009o/g, "\\to");
  t = t.replace(/\u0008eta/g, "\\beta");
  t = t.replace(/\u0008ar\{/g, "\\bar{");
  t = t.replace(/\u0008inom/g, "\\binom");
  t = t.replace(/\u0008egin\{/g, "\\begin{");
  t = t.replace(/ρ/g, "\\rho");
  return t;
}

export function repairMineruPhysicsOcr(text: string): string {
  let t = text;
  t = t.replace(/\\lor\s*\/?\s*\\mathrm\s*\{\s*m\s*\}/gi, "\\mathrm{V/m}");
  t = t.replace(/\\lor\s*\/?\s*m\b/gi, "\\mathrm{V/m}");
  t = t.replace(/\\mathsf\s*\{\s*c\s*o\s*s\s*\}/gi, "\\cos");
  t = t.replace(/\\mathsf\s*\{\s*s\s*i\s*n\s*\}/gi, "\\sin");
  t = t.replace(/\\(cos|sin|tan)\s*\{\s*\\left/gi, "\\$1\\left");
  t = t.replace(/\\cos\s*\{\s*\\left/g, "\\cos\\left");
  t = t.replace(/\\sin\s*\{\s*\\left/g, "\\sin\\left");
  t = t.replace(/\\(cos|sin|tan|cot|sec|csc)\s+\(/gi, "\\$1(");
  t = t.replace(/\bBy\s*=/g, "B_{y} =");
  t = t.replace(/\bBx\s*=/g, "B_{x} =");
  t = t.replace(/\bBz\s*=/gi, "B_{z} =");
  t = t.replace(/B_\{Z\}/g, "B_{z}");
  t = t.replace(/\bEz\s*=/gi, "E_{z} =");
  t = t.replace(/1\.5\s*[×x]\s*109\s*t/g, "1.5 \\times 10^{9} t");
  t = t.replace(/1\.5\s*\\times\s*109\s*t/g, "1.5 \\times 10^{9} t");
  t = t.replace(/(\d)\s*\\times\s*10\s*\^\s*\{\s*-\s*7\s*\}/g, "$1 \\times 10^{-7}");
  t = t.replace(/(\d)\^(\d+)(?=[a-zA-Z])/g, "$1^{$2}");
  t = t.replace(/\b([A-Z])_([a-z])\b/g, "$1_{$2}");
  t = t.replace(/(?<![\\a-zA-Z])(sin|cos|tan|cot|sec|csc|log|ln)(?=\s*\()/gi, "\\$1");
  // Electron configs: digit + \alpha^ was a mis-normalized d-orbital (NEET_2025_Q53).
  t = t.replace(/(?<=\d)\s*\\alpha(?=\s*\^)/g, " d");
  return t;
}

/** Mid-sentence `$$` (e.g. `a$$\mathrm`) breaks remark-math when closed with a single `$`. */
export function repairStrayDisplayDollars(text: string): string {
  return text.replace(/([A-Za-z0-9,.;:])\s*\$\$/g, "$1 $");
}

/**
 * Unwrap `$...$` that is clearly English prose.
 * KaTeX math mode collapses spaces → "Givenbelowaretwostatements".
 */
export function unwrapProseMathDelimiters(text: string): string {
  return text.replace(/\$([^$\n]+)\$/g, (full, inner: string) => {
    const body = inner.trim();
    if (!body) return full;
    if (/\\[a-zA-Z]/.test(body) || /[_^]/.test(body)) return full;
    const letterWords = body
      .split(/\s+/)
      .filter((w) => /^[A-Za-z][A-Za-z'-]*$/.test(w) && w.length >= 2);
    if (letterWords.length >= 3) return body;
    return full;
  });
}

/** Pull common English words out of `\mathrm{ion}`-style math wrappers. */
export function repairMathrmProseWords(text: string): string {
  return text.replace(
    /\$([^$]*?)\\mathrm\{(ion|and|or|of|to|in|the|with)\}([^$]*)\$/gi,
    (_full, before: string, word: string, after: string) => {
      const left = before.trimEnd();
      const right = after.trimStart();
      const leftPart = left ? `$${left}$` : "";
      const rightPart = right ? `$${right}$` : "";
      return `${leftPart} ${word} ${rightPart}`.replace(/ {2,}/g, " ").trim();
    }
  );
}

/** Bare ions outside math: `Co2+` / `Cr^{2+}` → `$Co^{2+}$` / `$Cr^{2+}$`. */
export function wrapBareIonSuperscripts(text: string): string {
  return text
    .split(/(\$\$[\s\S]*?\$\$|\$[^$]+\$)/g)
    .map((part) => {
      if (part.startsWith("$")) return part;
      // Co2+, Al3+ (OCR/plain ASCII charge) — do not use \b after +/- (fails at EOL).
      let out = part.replace(
        /(?<![A-Za-z0-9])([A-Z][a-z]?)(\d{1,2})([+-])(?![A-Za-z0-9])/g,
        "$$$1^{$2$3}$"
      );
      // Already caret-braced: Cr^{2+}
      out = out.replace(
        /(?<![A-Za-z0-9$])([A-Z][a-z]?)(\^\{[0-9+\-]+\})(?![A-Za-z0-9])/g,
        "$$$1$2$"
      );
      return out;
    })
    .join("");
}

export function repairPseudoDollarDelimiters(text: string): string {
  let t = text;
  t = t.replace(/\\left\s*\$\$/g, "\\left(");
  t = t.replace(/\\left\s*\$/g, "\\left(");
  t = t.replace(/\\right\)\s*\$\$/g, "\\right)");
  t = t.replace(/\\right\s*\$\$/g, "\\right)");
  // Undo prior over-eager repair that turned \rightarrow into \right)arrow
  t = t.replace(/\\right\)arrow\b/g, "\\rightarrow");
  t = t.replace(/\\(cos|sin|tan|cot|sec|csc)\s*\$\$([^$]+)\$\$/gi, "\\$1($2)");
  // Statement / chemistry stem damage
  t = repairStrayDisplayDollars(t);
  t = unwrapProseMathDelimiters(t);
  t = repairMathrmProseWords(t);
  t = wrapBareIonSuperscripts(t);
  t = t.replace(/(?<=\d)\s*\\alpha(?=\s*\^)/g, " d");
  return t;
}

/** Core math body repair before KaTeX / display-math wrapping. */
export function repairMathBody(latex: string): string {
  let t = latex.trim();
  while (t.startsWith("$")) t = t.slice(1).trim();
  while (t.endsWith("$")) t = t.slice(0, -1).trim();
  t = collapseOverEscapedBackslashes(t);
  t = repairJsonEscapedLatex(t);
  t = repairMineruPhysicsOcr(t);
  t = t.replace(/\\\{/g, "{").replace(/\\\}/g, "}");
  t = t.replace(/\\left\s*\$\$/g, "\\left(");
  t = t.replace(/\\left\s*\$/g, "\\left(");
  t = t.replace(/\\right\)\s*\$\$/g, "\\right)");
  t = t.replace(/\\right\s*\$\$/g, "\\right)");
  t = t.replace(/\\left\s*\\frac/g, "\\left(\\frac");
  // Incomplete \right delimiter — never touch \rightarrow / \Rightarrow / \rightleftharpoons …
  t = t.replace(/\\right\)arrow\b/g, "\\rightarrow");
  t = t.replace(/\\right(?![a-zA-Z)\]|.|])/g, "\\right)");
  return t.trim();
}
