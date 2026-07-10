package com.neetlu.examhunt.service;

import java.util.regex.Pattern;

/** JSON + LaTeX escape repair (pdf-qa-extractor {@code parsers._relax_json_latex_escapes} parity). */
public final class JsonLatexEscapeRepair {

    private static final Pattern ESCAPED_NL = Pattern.compile("\\\\n(?![a-zA-Z])");

    private static final String[] LATEX_JSON_COMMANDS = {
        "frac", "sqrt", "sin", "cos", "tan", "log", "ln", "beta", "theta", "alpha", "lambda", "mu",
        "pi", "sigma", "Delta", "sum", "int", "propto", "Rightarrow", "left", "right", "text",
        "mathbf", "mathrm", "cdot", "times", "leq", "geq", "neq", "begin", "end", "array", "dfrac",
        "nabla", "rho", "rightarrow", "implies", "quad", "qquad", "infty", "partial", "vec", "hat",
        "overline", "underline", "operatorname", "boldsymbol"
    };

    private static final String[][] JSON_ESCAPE_LATEX_FIXES = {
        {"\u000crac", "\\frac"},
        {"\u000crac{", "\\frac{"},
        {"\u0008eta", "\\beta"},
        {"\t" + "heta", "\\theta"},
        {"\t" + "an", "\\tan"},
        {"\t" + "imes", "\\times"},
        {"\t" + "ext", "\\text"},
        {"\n" + "abla", "\\nabla"},
        {"\n" + "eq", "\\neq"},
        {"\n" + "ot", "\\not"},
        {"\n" + "ewline", "\\newline"},
        {"\r" + "ho", "\\rho"},
        {"\r" + "ightarrow", "\\rightarrow"},
    };

    private JsonLatexEscapeRepair() {}

    public static String relaxJsonLatexEscapes(String text) {
        if (text == null || text.isBlank()) {
            return text == null ? "" : text;
        }
        String relaxed = text.replace("\\(", "(").replace("\\)", ")");
        for (String cmd : LATEX_JSON_COMMANDS) {
            relaxed = relaxed.replace("\\" + cmd, "\\\\" + cmd);
        }
        return relaxed.replaceAll("\\\\(?![\"\\\\/bfnrtu])", "\\\\\\\\");
    }

    public static String repairAfterJsonUnescape(String text) {
        return normalizeEscapedNewlines(applyCorruptionFixes(text));
    }

    /** Shared corruption repair after JSON.parse ate LaTeX backslash sequences. */
    public static String applyCorruptionFixes(String text) {
        if (text == null || text.isBlank()) {
            return text == null ? "" : text;
        }
        String repaired = text;
        for (String[] pair : JSON_ESCAPE_LATEX_FIXES) {
            repaired = repaired.replace(pair[0], pair[1]);
        }
        repaired = repaired.replaceAll("(?<![\\\\$])frac\\{", "\\\\frac{");
        repaired = repaired.replaceAll("(?<![\\\\$])sqrt\\{", "\\\\sqrt{");
        repaired = repaired.replaceAll("(?<![\\\\$])dfrac\\{", "\\\\dfrac{");
        return repaired;
    }

    public static String normalizeEscapedNewlines(String text) {
        if (text == null) {
            return "";
        }
        return ESCAPED_NL.matcher(text).replaceAll("\n");
    }
}
