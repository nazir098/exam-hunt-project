package com.neetlu.examhunt.service;

import java.util.regex.Pattern;

/** Plain-text excerpts for search indexing (LaTeX/markdown stripped). */
public final class SeoTextUtil {

    private static final Pattern ASSET_MARKER = Pattern.compile("\\{\\{asset:\\d+}}");
    private static final Pattern LATEX_COMMAND = Pattern.compile("\\\\[a-zA-Z]+\\{([^}]*)}");
    private static final Pattern LATEX_SUBSUP = Pattern.compile("[_^{}]");
    private static final Pattern MATH_DELIM = Pattern.compile("\\$+");
    private static final Pattern MARKDOWN = Pattern.compile("\\*\\*");
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    private SeoTextUtil() {}

    public static String toPlainText(String raw) {
        if (raw == null) {
            return "";
        }
        String text = raw.strip();
        if (text.isEmpty()) {
            return "";
        }
        text = ASSET_MARKER.matcher(text).replaceAll(" ");
        text = LATEX_COMMAND.matcher(text).replaceAll("$1");
        text = MATH_DELIM.matcher(text).replaceAll(" ");
        text = LATEX_SUBSUP.matcher(text).replaceAll(" ");
        text = text.replace('\\', ' ');
        text = MARKDOWN.matcher(text).replaceAll("");
        text = WHITESPACE.matcher(text).replaceAll(" ").strip();
        return text;
    }

    public static String excerpt(String raw, int maxLen) {
        String plain = toPlainText(raw);
        if (plain.length() <= maxLen) {
            return plain;
        }
        return plain.substring(0, Math.max(0, maxLen - 3)).strip() + "...";
    }
}
