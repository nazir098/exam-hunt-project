package com.neetlu.examhunt.service;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Normalizes LLM / enrichment text for markdown + KaTeX rendering in the UI. */
public final class AiTextNormalizer {

    private static final Pattern PAREN_LATEX =
            Pattern.compile("\\(\\s*([^()]*\\\\[a-zA-Z][^()]*)\\s*\\)");
    private static final Pattern DOLLAR_LATEX = Pattern.compile("\\$([^$]+)\\$");
    private static final Pattern MODE_LINE = Pattern.compile("(?im)^mode:\\s*.*\\R?");

    private AiTextNormalizer() {}

    /** Single pipeline for manifest enrichment + API text that may contain inline math. */
    public static String sanitizeEnrichmentText(String text) {
        if (text == null || text.isBlank()) {
            return text == null ? "" : text;
        }
        String t = text.strip();
        t = normalizeLatexDelimiters(t);
        t = normalizeInlineMath(t);
        return t;
    }

    public static String normalize(String text) {
        if (text == null || text.isBlank()) {
            return text == null ? "" : text;
        }
        String t = stripMetaPreamble(text.strip());
        t = normalizeBasicsStructure(t);
        t = normalizeSectionHeaders(t);
        t = normalizeLatexDelimiters(t);
        t = normalizeInlineMath(t);
        return t;
    }

    private static final String[] BASICS_SECTIONS = {
        "Concept",
        "Key Formula(s)",
        "How to Approach This Question",
        "Common Mistake"
    };

    /** Turn **Concept** and inline ### headings into line-start markdown h3 sections. */
    private static String normalizeBasicsStructure(String text) {
        String t = text;
        for (String title : BASICS_SECTIONS) {
            String esc = title.replace("(", "\\(").replace(")", "\\)");
            t = t.replaceAll("(?i)\\*\\*\\s*" + esc + "\\s*\\*\\*", "\n\n### " + title + "\n\n");
        }
        t = t.replaceAll(
                "([.!?])\\s*(###\\s+(?:Concept|Key Formula\\(s\\)|How to Approach This Question|Common Mistake))",
                "$1\n\n$2\n\n");
        t = t.replaceAll(
                "(\\S)\\s+(###\\s+(?:Concept|Key Formula\\(s\\)|How to Approach This Question|Common Mistake))",
                "$1\n\n$2\n\n");
        t = t.replaceAll("(\\n###[^\\n]+)\\s+(?=\\d+\\.\\s)", "$1\n\n");
        t = t.replaceAll("\\n{3,}", "\n\n");
        return t.strip();
    }

    /** Remove echoed internal prompt lines (Mode:, repeated metadata) before the first heading. */
    public static String stripMetaPreamble(String text) {
        if (text == null || text.isBlank()) {
            return text == null ? "" : text;
        }
        String t = MODE_LINE.matcher(text.strip()).replaceAll("");
        t = t.replaceAll("(?im)^task:\\s*.*\\R?", "");
        int heading = indexOfFirstHeading(t);
        if (heading < 0) {
            heading = indexOfBoldConcept(t);
        }
        if (heading > 0) {
            t = t.substring(heading);
        }
        return t.strip();
    }

    private static int indexOfBoldConcept(String text) {
        var m = Pattern.compile("(?i)\\*\\*\\s*Concept\\s*\\*\\*").matcher(text);
        return m.find() ? m.start() : -1;
    }

    private static int indexOfFirstHeading(String text) {
        var m = Pattern.compile("(?im)^(?:### |## )").matcher(text);
        return m.find() ? m.start() : -1;
    }

    private static String normalizeSectionHeaders(String text) {
        return text.replaceAll("(?im)^Key Facts:\\s*$", "### Key facts")
                .replaceAll("(?im)^Traps:\\s*$", "### Common mistakes")
                .replaceAll("(?im)^Memory Hook:\\s*$", "### Memory hook");
    }

    private static String normalizeLatexDelimiters(String text) {
        String t = text.replaceAll("\\\\\\((.*?)\\\\\\)", "\\$$1\\$");
        var m = PAREN_LATEX.matcher(t);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            m.appendReplacement(sb, "\\$" + Matcher.quoteReplacement(m.group(1).strip()) + "\\$");
        }
        m.appendTail(sb);
        return sb.toString();
    }

    /** Fix LaTeX inside every `$...$` segment (hints, basics, formulas). */
    public static String normalizeInlineMath(String text) {
        if (text == null || text.isBlank()) {
            return text == null ? "" : text;
        }
        Matcher m = DOLLAR_LATEX.matcher(text);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            String fixed = normalizeMathContent(m.group(1));
            m.appendReplacement(sb, Matcher.quoteReplacement("$" + fixed + "$"));
        }
        m.appendTail(sb);
        return sb.toString();
    }

    /** Strip $ delimiters for embedding in another markdown template. */
    public static String stripMathDelimiters(String latex) {
        if (latex == null || latex.isBlank()) {
            return latex == null ? "" : latex;
        }
        String t = normalizeMathContent(latex);
        t = normalizeLatexDelimiters(t);
        var m = DOLLAR_LATEX.matcher(t);
        if (m.matches()) {
            return normalizeMathContent(m.group(1).strip());
        }
        return t;
    }

    /** Repair common enrichment / LLM LaTeX typos before KaTeX. */
    public static String normalizeFormulaLatex(String latex) {
        return normalizeMathContent(latex);
    }

    /** Repair LaTeX command bodies (inline math, formulas, hints). */
    public static String normalizeMathContent(String latex) {
        if (latex == null || latex.isBlank()) {
            return latex == null ? "" : latex;
        }
        String t = latex.strip();
        while (t.startsWith("$")) {
            t = t.substring(1).strip();
        }
        while (t.endsWith("$")) {
            t = t.substring(0, t.length() - 1).strip();
        }
        t = collapseOverEscapedBackslashes(t);
        t = repairJsonEscapedLatex(t);
        // Over-escaped braces from bad JSON export: \{GM\} → {GM}
        t = t.replace("\\{", "{");
        t = t.replace("\\}", "}");
        // \left\frac → \left(\frac
        t = t.replaceAll("\\\\left\\s*\\\\frac", "\\\\left(\\\\frac");
        // \right with no closing delimiter (e.g. "\right$$" from bad export)
        t = t.replaceAll("\\\\right(?![)\\]|.|])", "\\\\right)");
        return t.strip();
    }

    /** Manifest / JSON double-escaping: {@code \\frac} → {@code \frac}. */
    private static String collapseOverEscapedBackslashes(String t) {
        String prev;
        do {
            prev = t;
            t = t.replaceAll("\\\\\\\\([a-zA-Z])", "\\\\$1");
        } while (!t.equals(prev));
        return t;
    }

    /**
     * JSON treats {@code \f}, {@code \t}, {@code \b}, {@code \n}, {@code \r} as control chars inside
     * LaTeX commands — e.g. {@code \frac} becomes form-feed + {@code rac}.
     */
    private static String repairJsonEscapedLatex(String t) {
        t = t.replace("\u000C", "");
        t = t.replaceAll("-rac\\{", "-\\\\frac{");
        t = t.replaceAll("-rac(?=\\{)", "-\\\\frac");
        t = t.replaceAll("(?<![\\\\a-zA-Z])rac\\{", "\\\\frac{");

        t = t.replace("\u0009imes", "\\\\times");
        t = t.replace("\u0009ext\\{", "\\\\text{");
        t = t.replace("\u0009heta", "\\\\theta");
        t = t.replace("\u0009au", "\\\\tau");
        t = t.replace("\u0009o", "\\\\to");

        t = t.replace("\u0008eta", "\\\\beta");
        t = t.replace("\u0008ar\\{", "\\\\bar{");
        t = t.replace("\u0008inom", "\\\\binom");
        t = t.replace("\u0008egin\\{", "\\\\begin{");

        t = t.replaceAll("\\nu", "\\\\nu");
        t = t.replaceAll("\\nabla", "\\\\nabla");
        t = t.replace("\rho", "\\\\rho");
        return t;
    }
}
