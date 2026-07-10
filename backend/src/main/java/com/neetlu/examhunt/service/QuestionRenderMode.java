package com.neetlu.examhunt.service;

/** Normalizes pdf-qa-extractor render_mode for API responses. */
public final class QuestionRenderMode {

    private QuestionRenderMode() {}

    /** Only structured/hybrid use text layout; everything else defaults to image. */
    public static String normalize(String renderMode) {
        String mode = renderMode == null ? "" : renderMode.strip().toLowerCase();
        if ("structured".equals(mode) || "hybrid".equals(mode)) {
            return mode;
        }
        return "image";
    }
}
