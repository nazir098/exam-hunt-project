package com.neetlu.examhunt.service;

/** Low-level LaTeX repair shared by {@link AiTextNormalizer} and JSON parsers. */
public final class MathRepairCore {

    private MathRepairCore() {}

    public static String collapseOverEscapedBackslashes(String t) {
        if (t == null || t.isBlank()) {
            return t == null ? "" : t;
        }
        String prev;
        do {
            prev = t;
            t = t.replaceAll("\\\\\\\\([a-zA-Z])", "\\\\$1");
        } while (!t.equals(prev));
        return t;
    }

    public static String repairJsonEscapedLatex(String t) {
        if (t == null || t.isBlank()) {
            return t == null ? "" : t;
        }
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

        t = t.replace("ρ", "\\rho");
        return JsonLatexEscapeRepair.applyCorruptionFixes(t);
    }

    /** MinerU OCR fixes mirrored from pdf-qa-extractor {@code _fix_mineru_ocr_symbols}. */
    public static String repairMineruPhysicsOcr(String t) {
        if (t == null || t.isBlank()) {
            return t == null ? "" : t;
        }
        t = t.replaceAll("(?i)\\\\lor\\s*/?\\s*\\\\mathrm\\s*\\{\\s*m\\s*\\}", "\\\\mathrm{V/m}");
        t = t.replaceAll("(?i)\\\\lor\\s*/?\\s*m\\b", "\\\\mathrm{V/m}");
        t = t.replaceAll("(?i)\\\\mathsf\\s*\\{\\s*c\\s*o\\s*s\\s*\\}", "\\\\cos");
        t = t.replaceAll("(?i)\\\\mathsf\\s*\\{\\s*s\\s*i\\s*n\\s*\\}", "\\\\sin");
        t = t.replaceAll("(?i)\\\\(cos|sin|tan)\\s*\\{\\s*\\\\left", "\\\\$1\\\\left");
        t = t.replaceAll("\\\\cos\\s*\\{\\s*\\\\left", "\\\\cos\\\\left");
        t = t.replaceAll("\\\\sin\\s*\\{\\s*\\\\left", "\\\\sin\\\\left");
        t = t.replaceAll("(?i)\\\\(cos|sin|tan|cot|sec|csc)\\s+\\(", "\\\\$1(");
        t = t.replaceAll("\\bBy\\s*=", "B_{y} =");
        t = t.replaceAll("\\bBx\\s*=", "B_{x} =");
        t = t.replaceAll("(?i)\\bBz\\s*=", "B_{z} =");
        t = t.replaceAll("B_\\{Z\\}", "B_{z}");
        t = t.replaceAll("(?i)\\bEz\\s*=", "E_{z} =");
        t = t.replaceAll("1\\.5\\s*[×x]\\s*109\\s*t", "1.5 \\\\times 10^{9} t");
        t = t.replaceAll("1\\.5\\s*\\\\times\\s*109\\s*t", "1.5 \\\\times 10^{9} t");
        t = t.replaceAll("(\\d)\\s*\\\\times\\s*10\\s*\\^\\s*\\{\\s*-\\s*7\\s*\\}", "$1 \\\\times 10^{-7}");
        t = t.replaceAll("(\\d)\\^(\\d+)(?=[a-zA-Z])", "$1^{$2}");
        t = t.replaceAll("\\b([A-Z])_([a-z])\\b", "$1_{$2}");
        t = t.replaceAll("(?<![\\\\a-zA-Z])(sin|cos|tan|cot|sec|csc|log|ln)(?=\\s*\\()", "\\\\$1");
        // Electron configs: digit + \alpha^ was a mis-normalized d-orbital (NEET_2025_Q53).
        t = t.replaceAll("(?<=\\d)\\s*\\\\alpha(?=\\s*\\^)", " d");
        return t;
    }

    public static String repairPseudoDollarDelimiters(String t) {
        if (t == null || t.isBlank()) {
            return t == null ? "" : t;
        }
        t = t.replaceAll("\\\\left\\s*\\$\\$", "\\\\left(");
        t = t.replaceAll("\\\\left\\s*\\$", "\\\\left(");
        t = t.replaceAll("\\\\right\\)\\s*\\$\\$", "\\\\right)");
        t = t.replaceAll("\\\\right\\s*\\$\\$", "\\\\right)");
        // Undo prior over-eager repair that turned \rightarrow into \right)arrow
        while (t.contains("\\right)arrow")) {
            t = t.replace("\\right)arrow", "\\rightarrow");
        }
        t = t.replaceAll("\\\\(cos|sin|tan|cot|sec|csc)\\s*\\$\\$([^$]+)\\$\\$", "\\\\$1($2)");
        t = repairStrayDisplayDollars(t);
        t = unwrapProseMathDelimiters(t);
        t = repairMathrmProseWords(t);
        t = wrapBareIonSuperscripts(t);
        t = t.replaceAll("(?<=\\d)\\s*\\\\alpha(?=\\s*\\^)", " d");
        return t;
    }

    /** Mid-sentence {@code $$} (e.g. {@code a$$\mathrm}) breaks remark-math when closed with {@code $}. */
    public static String repairStrayDisplayDollars(String t) {
        if (t == null || t.isBlank()) {
            return t == null ? "" : t;
        }
        return t.replaceAll("([A-Za-z0-9,.;:])\\s*\\$\\$", "$1 \\$");
    }

    /**
     * Unwrap {@code $...$} that is clearly English prose.
     * KaTeX math mode collapses spaces → {@code Givenbelowaretwostatements}.
     */
    public static String unwrapProseMathDelimiters(String t) {
        if (t == null || t.isBlank()) {
            return t == null ? "" : t;
        }
        java.util.regex.Pattern inline =
                java.util.regex.Pattern.compile("\\$([^$\\n]+)\\$");
        java.util.regex.Matcher m = inline.matcher(t);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            String body = m.group(1).strip();
            if (body.isEmpty()
                    || body.matches(".*\\\\[a-zA-Z].*")
                    || body.matches(".*[_^].*")) {
                m.appendReplacement(sb, java.util.regex.Matcher.quoteReplacement(m.group()));
                continue;
            }
            int letterWords = 0;
            for (String w : body.split("\\s+")) {
                if (w.matches("[A-Za-z][A-Za-z'-]*") && w.length() >= 2) {
                    letterWords++;
                }
            }
            String replacement = letterWords >= 3 ? body : m.group();
            m.appendReplacement(sb, java.util.regex.Matcher.quoteReplacement(replacement));
        }
        m.appendTail(sb);
        return sb.toString();
    }

    /** Pull common English words out of {@code \\mathrm{ion}}-style math wrappers. */
    public static String repairMathrmProseWords(String t) {
        if (t == null || t.isBlank()) {
            return t == null ? "" : t;
        }
        java.util.regex.Pattern p =
                java.util.regex.Pattern.compile(
                        "\\$([^$]*?)\\\\mathrm\\{(ion|and|or|of|to|in|the|with)\\}([^$]*)\\$",
                        java.util.regex.Pattern.CASE_INSENSITIVE);
        java.util.regex.Matcher m = p.matcher(t);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            String left = m.group(1).stripTrailing();
            String word = m.group(2);
            String right = m.group(3).stripLeading();
            String leftPart = left.isEmpty() ? "" : "$" + left + "$";
            String rightPart = right.isEmpty() ? "" : "$" + right + "$";
            String rebuilt = (leftPart + " " + word + " " + rightPart).replaceAll(" {2,}", " ").strip();
            m.appendReplacement(sb, java.util.regex.Matcher.quoteReplacement(rebuilt));
        }
        m.appendTail(sb);
        return sb.toString();
    }

    /** {@code Cr^{2+}} outside math → {@code $Cr^{2+}$}. */
    public static String wrapBareIonSuperscripts(String t) {
        if (t == null || t.isBlank()) {
            return t == null ? "" : t;
        }
        java.util.regex.Pattern chunks =
                java.util.regex.Pattern.compile("(\\$\\$[\\s\\S]*?\\$\\$|\\$[^$]+\\$)");
        java.util.regex.Matcher m = chunks.matcher(t);
        StringBuilder sb = new StringBuilder();
        int last = 0;
        while (m.find()) {
            sb.append(wrapIonInProse(t.substring(last, m.start())));
            sb.append(m.group());
            last = m.end();
        }
        sb.append(wrapIonInProse(t.substring(last)));
        return sb.toString();
    }

    private static String wrapIonInProse(String segment) {
        // Co2+, Al3+ (plain ASCII charge) → $Co^{2+}$
        // Avoid \\b after +/- — no word boundary at EOL after a non-word char.
        String out =
                segment.replaceAll(
                        "(?<![A-Za-z0-9])([A-Z][a-z]?)(\\d{1,2})([+-])(?![A-Za-z0-9])",
                        "\\$$1^{$2$3}\\$");
        // Already caret-braced: Cr^{2+}
        return out.replaceAll(
                "(?<![A-Za-z0-9$])([A-Z][a-z]?)(\\^\\{[0-9+\\-]+\\})(?![A-Za-z0-9])",
                "\\$$1$2\\$");
    }
}
