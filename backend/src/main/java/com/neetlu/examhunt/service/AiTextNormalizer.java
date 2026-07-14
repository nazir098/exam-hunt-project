package com.neetlu.examhunt.service;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Normalizes LLM / enrichment text for markdown + KaTeX rendering in the UI. */
public final class AiTextNormalizer {

    private static final Pattern PAREN_LATEX =
            Pattern.compile("\\(\\s*([^()]*\\\\[a-zA-Z][^()]*)\\s*\\)");
    private static final Pattern DOLLAR_LATEX = Pattern.compile("\\$([^$]+)\\$");
    private static final Pattern MODE_LINE = Pattern.compile("(?im)^mode:\\s*.*\\R?");
    private static final Pattern NUMERIC_OPTION_MARKER = Pattern.compile("\\(\\s*([1-4])\\s*\\)");
    private static final Pattern BARE_TRIG_CALL =
            Pattern.compile("(?<![\\\\a-zA-Z])(sin|cos|tan|cot|sec|csc|log|ln)(?=\\s*\\()", Pattern.CASE_INSENSITIVE);
    private static final Pattern LOOKS_LIKE_LATEX = Pattern.compile("\\\\|[\\^_]\\s*\\{");
    /** Wrap individual {@code \\mu_k}-style tokens in prose (pdf-qa-extractor math-render.js parity). */
    private static final Pattern BARE_LATEX_FRAGMENT =
            Pattern.compile(
                    "\\\\(?:[a-zA-Z]+(?:_\\{?[a-zA-Z0-9]+\\}?|\\^\\{?[a-zA-Z0-9]+\\}?)?(?:\\{[^{}]*\\})*)");
    private static final Pattern LATEX_ENV_BLOCK =
            Pattern.compile("\\\\begin\\{([^}]+)\\}([\\s\\S]*?)\\\\end\\{\\1\\}");
    private static final Pattern LATEX_ENV_FULL =
            Pattern.compile("\\\\begin\\{([a-zA-Z*]+)\\}(?:\\{[^}]*\\})?[\\s\\S]*?\\\\end\\{\\1\\}");
    private static final Pattern DOLLAR_WRAP_ENV =
            Pattern.compile(
                    "\\${1,2}\\s*(\\\\begin\\{[a-zA-Z*]+\\}(?:\\{[^}]*\\})?[\\s\\S]*?\\\\end\\{[a-zA-Z*]+\\})\\s*\\${1,2}");
    private static final Pattern DOLLAR_ONLY_LINE = Pattern.compile("(?m)^\\s*\\$+\\s*$");

    private AiTextNormalizer() {}

    /** Single pipeline for manifest enrichment + API text that may contain inline math. */
    public static String sanitizeEnrichmentText(String text) {
        if (text == null || text.isBlank()) {
            return text == null ? "" : text;
        }
        String t = text.strip();
        t = normalizeSolutionSteps(t);
        return normalizeMathSegments(t, true);
    }

    /**
     * Structured / hybrid question stems from pdf-qa-extractor — preserve {@code $...$} blocks and
     * {@code {{asset:N}}} markers; strip duplicated {@code (1)–(4)} option blocks when options are stored separately.
     */
    public static String sanitizeQuestionStemText(String text) {
        if (text == null || text.isBlank()) {
            return text == null ? "" : text;
        }
        String t = text.strip();
        t = trimEmbeddedMcqOptions(t);
        // Repair \left$$ before ensureMathBoundarySpaces (which would insert `\left $$`).
        t = MathRepairCore.repairPseudoDollarDelimiters(t);
        t = ensureMathBoundarySpaces(t);
        return sanitizeStructuredMcqText(t, false);
    }

    /**
     * MCQ option bodies from pdf-qa-extractor — wrap bare LaTeX in {@code $...$} and repair MinerU OCR
     * (mirrors extractor {@code _normalize_option_math} / {@code _clean_option_text}).
     */
    public static String sanitizeMcqOptionText(String text) {
        if (text == null || text.isBlank()) {
            return text == null ? "" : text;
        }
        String t = text.strip();
        t = t.replaceFirst("^\\(\\s*\\d+\\s*\\)\\s*", "");
        return sanitizeStructuredMcqText(t, true);
    }

    /**
     * Official PYQ solution steps — repair broken {@code $$} delimiters and wrap bare LaTeX per line
     * (one equation per paragraph for reliable KaTeX).
     */
    public static String sanitizeSolutionText(String text) {
        if (text == null || text.isBlank()) {
            return text == null ? "" : text;
        }
        String t = text.strip();
        t = t.replaceAll("(?m)^Sol\\.?\\s*:?\\s*", "");
        t = repairMarkdownTableSpacing(t);
        t = MathRepairCore.repairPseudoDollarDelimiters(t);
        t = repairMalformedEnvironmentOpener(t);
        t = t.replaceAll("\\${4,}", "\n\n");
        String result = normalizeSolutionWithEnvironments(prepareSolutionForEnvironments(t));
        if (hasUnwrappedLatexEnvironment(result)) {
            result =
                    normalizeSolutionWithEnvironments(
                            prepareSolutionForEnvironments(dedollarizeEnvironmentFragments(result)));
        }
        return result;
    }

    /** True when LaTeX environments are not wrapped in display math ($$). */
    public static boolean looksLikeCorruptSolution(String text) {
        if (text == null || text.isBlank() || !text.contains("\\begin{")) {
            return false;
        }
        if (text.contains("\\begin{array{") || text.contains("\\begin{aligned{")) {
            return true;
        }
        String withoutDisplay = text.replaceAll("\\$\\$[\\s\\S]*?\\$\\$", "");
        return withoutDisplay.contains("\\begin{");
    }

    /** Repair {@code \\begin{array{l}} → {@code \\begin{array}{l}} from older env wrapping. */
    private static String repairMalformedEnvironmentOpener(String text) {
        return text.replaceAll("\\\\begin\\{([a-zA-Z*]+)\\{([a-zA-Z0-9|]+)\\}", "\\\\begin{$1}{$2}");
    }

    private static boolean hasUnwrappedLatexEnvironment(String text) {
        return looksLikeCorruptSolution(text);
    }

    private static String dedollarizeEnvironmentFragments(String text) {
        String t = text;
        t = t.replaceAll("(?m)^\\s*\\$+\\s*(\\\\begin\\{[a-zA-Z*]+}(?:\\{[^}]*})?)", "$1");
        t = t.replaceAll("(?m)(\\\\end\\{[a-zA-Z*]+})\\s*\\$+\\s*$", "$1");
        t = t.replaceAll("(?m)^\\s*\\$+\\s*(&.*)\\\\?\\s*$", "$1");
        t = t.replaceAll("(?m)^\\s*\\$+\\s*(\\\\implies\\b.*)\\s*$", "$1");
        return t;
    }

    private static String prepareSolutionForEnvironments(String text) {
        String t = DOLLAR_WRAP_ENV.matcher(text).replaceAll("$1");
        Matcher envMatcher = LATEX_ENV_FULL.matcher(t);
        StringBuilder stripped = new StringBuilder();
        int last = 0;
        while (envMatcher.find()) {
            stripped.append(t, last, envMatcher.start());
            stripped.append(envMatcher.group().replace("$", ""));
            last = envMatcher.end();
        }
        stripped.append(t.substring(last));
        t = stripped.toString();
        t = DOLLAR_ONLY_LINE.matcher(t).replaceAll("");
        return t;
    }

    private static String cleanProseAdjacentToMath(String prose) {
        if (prose == null || prose.isBlank()) {
            return "";
        }
        return prose.replaceAll("[\\s\\n]*\\$+[\\s\\n]*$", "")
                .replaceAll("^[\\s\\n]*\\$+[\\s\\n]*", "")
                .strip();
    }

    private static String normalizeSolutionWithEnvironments(String text) {
        Matcher matcher = LATEX_ENV_BLOCK.matcher(text);
        StringBuilder sb = new StringBuilder();
        int last = 0;
        boolean found = false;
        while (matcher.find()) {
            found = true;
            appendProseSolution(sb, cleanProseAdjacentToMath(text.substring(last, matcher.start())));
            if (!sb.isEmpty()) {
                sb.append("\n\n");
            }
            String env = matcher.group(1);
            String body = matcher.group(2);
            sb.append("$$\n\\begin{").append(env).append("}");
            sb.append(body).append("\\end{").append(env).append("}\n$$");
            last = matcher.end();
        }
        if (!found) {
            return normalizeProseSolution(text);
        }
        appendProseSolution(sb, cleanProseAdjacentToMath(text.substring(last)));
        return sb.toString().strip();
    }

    private static void appendProseSolution(StringBuilder sb, String prose) {
        String normalized = normalizeProseSolution(prose);
        if (normalized.isBlank()) {
            return;
        }
        if (!sb.isEmpty()) {
            sb.append("\n\n");
        }
        sb.append(normalized);
    }

    private static boolean looksLikeMarkdownTableRow(String line) {
        String t = line == null ? "" : line.strip();
        return t.startsWith("|") && t.indexOf('|', 1) >= 0;
    }

    private static String normalizeProseSolution(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }
        // Keep single newlines inside markdown tables; use blank lines only between prose blocks.
        String[] lines = text.strip().split("\\R", -1);
        StringBuilder blocks = new StringBuilder();
        StringBuilder table = new StringBuilder();
        StringBuilder prose = new StringBuilder();

        java.util.function.Consumer<StringBuilder> flushTable =
                (buf) -> {
                    if (buf.isEmpty()) {
                        return;
                    }
                    if (!blocks.isEmpty()) {
                        blocks.append("\n\n");
                    }
                    blocks.append(buf.toString().strip());
                    buf.setLength(0);
                };
        java.util.function.Consumer<StringBuilder> flushProse =
                (buf) -> {
                    if (buf.isEmpty()) {
                        return;
                    }
                    if (!blocks.isEmpty()) {
                        blocks.append("\n\n");
                    }
                    blocks.append(buf.toString().strip());
                    buf.setLength(0);
                };

        for (String rawLine : lines) {
            String line = rawLine.strip();
            if (line.isBlank() || "$".equals(line) || "$$".equals(line)) {
                continue;
            }
            line = normalizeSolutionLine(line);
            if (line.isBlank()) {
                continue;
            }
            if (looksLikeMarkdownTableRow(line)) {
                flushProse.accept(prose);
                if (!table.isEmpty()) {
                    table.append('\n');
                }
                table.append(line);
            } else {
                flushTable.accept(table);
                if (!prose.isEmpty()) {
                    prose.append("\n\n");
                }
                prose.append(line);
            }
        }
        flushTable.accept(table);
        flushProse.accept(prose);
        return blocks.toString().strip();
    }

    /** Collapse blank lines between markdown table rows. */
    public static String repairMarkdownTableSpacing(String text) {
        if (text == null || text.isBlank()) {
            return text == null ? "" : text;
        }
        return text.replaceAll("(\\|[^\\n]*\\|)\\n(?:[ \\t]*\\n)+(?=\\|)", "$1\n");
    }

    private static String normalizeSolutionLine(String line) {
        if (line == null || line.isBlank()) {
            return "";
        }
        String t = line.strip();
        if (t.startsWith("$$") && t.endsWith("$$") && t.length() > 4) {
            t = t.substring(2, t.length() - 2).strip();
        } else if (t.startsWith("$$")) {
            t = t.substring(2).strip();
            if (t.endsWith("$$")) {
                t = t.substring(0, t.length() - 2).strip();
            }
        }
        Matcher m = DOLLAR_LATEX.matcher(t);
        StringBuilder sb = new StringBuilder();
        int last = 0;
        boolean found = false;
        while (m.find()) {
            found = true;
            sb.append(wrapBareSolutionSegment(t.substring(last, m.start())));
            sb.append("$").append(normalizeMathContent(m.group(1))).append("$");
            last = m.end();
        }
        if (!found) {
            return wrapBareSolutionSegment(t);
        }
        sb.append(wrapBareSolutionSegment(t.substring(last)));
        return sb.toString().strip();
    }

    private static String wrapBareSolutionSegment(String segment) {
        if (segment == null || segment.isBlank()) {
            return "";
        }
        String trimmed = segment.strip();
        if (looksLikeBareSolutionMath(trimmed)) {
            return "$" + normalizeMathContent(trimmed) + "$";
        }
        return trimmed;
    }

    private static boolean looksLikeBareSolutionMath(String segment) {
        if (segment == null || segment.isBlank()) {
            return false;
        }
        String s = segment.strip();
        if (s.startsWith("$")) {
            return false;
        }
        if (s.contains("\\begin{") || s.contains("\\end{")) {
            return false;
        }
        if (s.matches(".*\\\\[a-zA-Z]{2,}.*")) {
            return true;
        }
        if (s.contains("\\frac")
                || s.contains("\\sqrt")
                || s.contains("\\Rightarrow")
                || s.contains("\\propto")
                || s.contains("\\text{")
                || s.contains("\\mathrm{")) {
            return true;
        }
        return s.matches(".*[=\\^_].*") && s.matches(".*[\\\\{}].*");
    }

    /** Shared pipeline for PYQ stems and options after import. */
    private static String sanitizeStructuredMcqText(String text, boolean optionBody) {
        if (text.isBlank()) {
            return "";
        }
        String t = MathRepairCore.repairPseudoDollarDelimiters(text.strip());
        if (!t.contains("$") && looksLikeLatex(t) && (optionBody || isCompactMathLine(t))) {
            String body = t.replace("$", "").strip();
            body = normalizeMathContent(body);
            return "$" + body + "$";
        }
        if (!t.contains("$")) {
            t = wrapBareLatexFragments(t);
        }
        t = normalizeLatexDelimitersOutsideMath(t, true);
        t = wrapBareLatexOutsideMath(t);
        t = normalizeInlineMath(t);
        if (optionBody && !t.contains("$") && looksLikeLatex(t)) {
            return "$" + normalizeMathContent(t) + "$";
        }
        return t.strip();
    }

    /** Short formula lines only — prose stems with inline {@code \\mu_k} must not become one math block. */
    private static boolean isCompactMathLine(String text) {
        String trimmed = text.strip();
        if (trimmed.length() > 100) {
            return false;
        }
        return trimmed.split("\\s+").length <= 8;
    }

    private static String wrapBareLatexFragments(String text) {
        Matcher m = BARE_LATEX_FRAGMENT.matcher(text);
        StringBuilder sb = new StringBuilder();
        int last = 0;
        while (m.find()) {
            sb.append(text, last, m.start());
            if (isInsideInlineMath(text, m.start())) {
                sb.append(m.group());
            } else {
                sb.append('$').append(m.group()).append('$');
            }
            last = m.end();
        }
        sb.append(text.substring(last));
        return sb.toString();
    }

    /** Drop trailing {@code (1)…(4)} blocks duplicated in stem when options are rendered separately. */
    static String trimEmbeddedMcqOptions(String text) {
        if (text == null || text.isBlank()) {
            return text == null ? "" : text;
        }
        Matcher m = NUMERIC_OPTION_MARKER.matcher(text);
        while (m.find()) {
            if (!"1".equals(m.group(1))) {
                continue;
            }
            if (isInsideInlineMath(text, m.start())) {
                continue;
            }
            String tail = text.substring(m.start());
            if (hasNumericOptionMarkers(tail, "2", "3", "4")) {
                return text.substring(0, m.start()).strip();
            }
        }
        return text.strip();
    }

    private static boolean hasNumericOptionMarkers(String text, String... ids) {
        for (String id : ids) {
            if (!NUMERIC_OPTION_MARKER.matcher(text).results().anyMatch(r -> id.equals(r.group(1)))) {
                return false;
            }
        }
        return true;
    }

    private static boolean isInsideInlineMath(String text, int index) {
        int dollars = 0;
        for (int i = 0; i < index; i++) {
            if (text.charAt(i) == '$') {
                dollars++;
            }
        }
        return dollars % 2 == 1;
    }

    private static boolean looksLikeLatex(String text) {
        return LOOKS_LIKE_LATEX.matcher(text).find();
    }

    private static String wrapBareLatexOutsideMath(String text) {
        Matcher m = DOLLAR_LATEX.matcher(text);
        StringBuilder sb = new StringBuilder();
        int last = 0;
        while (m.find()) {
            sb.append(wrapBareLatexSegment(text.substring(last, m.start())));
            sb.append(m.group(0));
            last = m.end();
        }
        sb.append(wrapBareLatexSegment(text.substring(last)));
        return sb.toString();
    }

    private static String wrapBareLatexSegment(String segment) {
        if (segment.isBlank()) {
            return segment;
        }
        String trimmed = segment.strip();
        if (looksLikeLatex(trimmed) && trimmed.contains("=")) {
            return "$" + normalizeMathContent(trimmed) + "$";
        }
        String withTrig = BARE_TRIG_CALL.matcher(segment).replaceAll("\\\\$1");
        if (!withTrig.equals(segment) && !withTrig.contains("$")) {
            return withTrig.replaceAll(
                    "(?i)([A-Za-z])\\s*(_\\{[a-z]\\}|_[a-z])?\\s*=\\s*([^\\n]+)",
                    "\\$$1$2 = $3$");
        }
        return segment;
    }

    private static String normalizeMathSegments(String text, boolean convertParenLatex) {
        String t = normalizeLatexDelimitersOutsideMath(text, convertParenLatex);
        return normalizeInlineMath(t);
    }

    /** Add spaces between prose and {@code $...$} when MinerU omits them after import. */
    private static String ensureMathBoundarySpaces(String text) {
        String t = text;
        t = t.replaceAll("([a-zA-Z])(\\$)", "$1 $2");
        t = t.replaceAll("(\\$)([a-zA-Z])", "$1 $2");
        t = t.replaceAll("(\\$\\$)([a-zA-Z])", "$1 $2");
        t = t.replaceAll("([a-zA-Z])(\\$\\$)", "$1 $2");
        return t.replaceAll(" {2,}", " ").strip();
    }

    private static String normalizeLatexDelimitersOutsideMath(String text, boolean convertParenLatex) {
        Matcher m = DOLLAR_LATEX.matcher(text);
        StringBuilder sb = new StringBuilder();
        int last = 0;
        while (m.find()) {
            sb.append(processNonMathSegment(text.substring(last, m.start()), convertParenLatex));
            sb.append(m.group(0));
            last = m.end();
        }
        sb.append(processNonMathSegment(text.substring(last), convertParenLatex));
        return sb.toString();
    }

    private static String processNonMathSegment(String segment, boolean convertParenLatex) {
        if (segment.isEmpty() || !convertParenLatex) {
            return segment;
        }
        var m = PAREN_LATEX.matcher(segment);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            String inner = m.group(1).strip();
            if (inner.contains("<<") || inner.contains(">>")) {
                m.appendReplacement(sb, Matcher.quoteReplacement(m.group(0)));
            } else {
                m.appendReplacement(sb, Matcher.quoteReplacement("$" + inner + "$"));
            }
        }
        m.appendTail(sb);
        return sb.toString();
    }

    public static String normalize(String text) {
        if (text == null || text.isBlank()) {
            return text == null ? "" : text;
        }
        String t = stripMetaPreamble(text.strip());
        t = normalizeSolutionSteps(t);
        t = normalizeBasicsStructure(t);
        t = normalizeSectionHeaders(t);
        return normalizeMathSegments(t, true);
    }

    private static final String[] BASICS_SECTIONS = {
        "Concept",
        "Key Formula(s)",
        "How to Approach This Question",
        "Common Mistake"
    };

    /** Turn **Concept** and inline ### headings into line-start markdown h3 sections. */
    /** Turn inline {@code **Step N**} markers into markdown h3 headings. */
    private static String normalizeSolutionSteps(String text) {
        if (text == null || text.isBlank()) {
            return text == null ? "" : text;
        }
        String t = text.replaceAll("(?i)\\*\\*Step\\s*(\\d+)\\s*:?\\*\\*", "\n\n### Step $1\n\n");
        t = t.replaceAll("([^\\n])\\s+(### Step \\d+)", "$1\n\n$2");
        t = t.replaceAll("\\n{3,}", "\n\n");
        return t.strip();
    }

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
        return normalizeLatexDelimitersOutsideMath(text, true);
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
        t = MathRepairCore.collapseOverEscapedBackslashes(t);
        t = MathRepairCore.repairJsonEscapedLatex(t);
        t = MathRepairCore.repairMineruPhysicsOcr(t);
        // Over-escaped braces from bad JSON export: \{GM\} → {GM}
        t = t.replace("\\{", "{");
        t = t.replace("\\}", "}");
        // LLM/export typo: \left$$ or \right)$$ used instead of parentheses
        t = t.replaceAll("\\\\left\\s*\\$\\$", "\\\\left(");
        t = t.replaceAll("\\\\left\\s*\\$", "\\\\left(");
        t = t.replaceAll("\\\\right\\)\\s*\\$\\$", "\\\\right)");
        t = t.replaceAll("\\\\right\\s*\\$\\$", "\\\\right)");
        // \left\frac → \left(\frac
        t = t.replaceAll("\\\\left\\s*\\\\frac", "\\\\left(\\\\frac");
        // Incomplete \right delimiter — never touch \rightarrow / \Rightarrow / …
        while (t.contains("\\right)arrow")) {
            t = t.replace("\\right)arrow", "\\rightarrow");
        }
        t = t.replaceAll("\\\\right(?![a-zA-Z)\\]\\|.\\|])", "\\\\right)");
        return t.strip();
    }
}
