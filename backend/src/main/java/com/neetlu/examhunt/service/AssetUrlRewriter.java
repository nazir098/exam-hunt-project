package com.neetlu.examhunt.service;

import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Builds public CDN URLs for extractor assets. Local-dev {@code /files/} URLs must not leak into
 * production API responses — browsers cannot load {@code http://127.0.0.1:8080/...} from the web app.
 */
public final class AssetUrlRewriter {

    private static final Pattern LOCAL_FILES =
            Pattern.compile(
                    "(?i)^https?://(?:localhost|127\\.0\\.0\\.1)(?::\\d+)?/files/(.+)$");

    private AssetUrlRewriter() {}

    public static boolean isLocalDevFilesUrl(String url) {
        if (url == null || url.isBlank()) {
            return false;
        }
        return LOCAL_FILES.matcher(url.strip()).matches();
    }

    /**
     * @param url relative path, absolute CDN URL, or local {@code /files/...} URL
     * @param sourceFolder pack year folder (e.g. {@code 2025})
     * @param publicBase {@code PUBLIC_FILES_BASE_URL} (R2 public base), may be blank
     */
    public static String rewrite(String url, String sourceFolder, String publicBase) {
        if (url == null || url.isBlank()) {
            return "";
        }
        String trimmed = url.strip();
        Matcher local = LOCAL_FILES.matcher(trimmed);
        if (local.matches()) {
            trimmed = local.group(1);
        } else if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            return trimmed;
        }
        while (trimmed.startsWith("/")) {
            trimmed = trimmed.substring(1);
        }
        String base = Optional.ofNullable(publicBase).orElse("").strip().replaceAll("/$", "");
        if (base.isBlank()) {
            return trimmed;
        }
        if (sourceFolder != null
                && !sourceFolder.isBlank()
                && trimmed.startsWith(sourceFolder + "/")) {
            return base + "/" + trimmed;
        }
        if (sourceFolder == null || sourceFolder.isBlank()) {
            return base + "/" + trimmed;
        }
        return base + "/" + sourceFolder + "/" + trimmed;
    }
}
