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
        return t;
    }

    public static String repairPseudoDollarDelimiters(String t) {
        if (t == null || t.isBlank()) {
            return t == null ? "" : t;
        }
        t = t.replaceAll("\\\\left\\$\\$", "\\\\left(");
        t = t.replaceAll("\\\\left\\$", "\\\\left(");
        t = t.replaceAll("\\\\right\\)\\$\\$", "\\\\right)");
        t = t.replaceAll("\\\\right\\$\\$", "\\\\right)");
        t = t.replaceAll("\\\\(cos|sin|tan|cot|sec|csc)\\$\\$([^$]+)\\$\\$", "\\\\$1($2)");
        return t;
    }
}
