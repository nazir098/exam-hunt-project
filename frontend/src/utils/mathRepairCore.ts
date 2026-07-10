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
  return t;
}

export function repairPseudoDollarDelimiters(text: string): string {
  let t = text;
  t = t.replace(/\\left\$\$/g, "\\left(");
  t = t.replace(/\\left\$/g, "\\left(");
  t = t.replace(/\\right\)\$\$/g, "\\right)");
  t = t.replace(/\\right\$\$/g, "\\right)");
  t = t.replace(/\\(cos|sin|tan|cot|sec|csc)\$\$([^$]+)\$\$/gi, "\\$1($2)");
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
  t = t.replace(/\\left\$\$/g, "\\left(");
  t = t.replace(/\\left\$/g, "\\left(");
  t = t.replace(/\\right\)\$\$/g, "\\right)");
  t = t.replace(/\\right\$\$/g, "\\right)");
  t = t.replace(/\\left\s*\\frac/g, "\\left(\\frac");
  t = t.replace(/\\right(?![)\]|.|])/g, "\\right)");
  return t.trim();
}
