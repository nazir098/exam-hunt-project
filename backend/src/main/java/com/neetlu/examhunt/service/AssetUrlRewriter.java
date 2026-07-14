package com.neetlu.examhunt.service;

import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Builds public CDN URLs for extractor assets. Local-dev {@code /files/} URLs must not leak into
 * production API responses — browsers cannot load {@code http://127.0.0.1:8080/...} from the web app.
 *
 * <p>{@code PUBLIC_FILES_BASE_URL} must be the R2 (or CDN) public base even when the API runs on
 * localhost. A localhost files base is ignored so Mongo never stores local-dev hosts.
 */
public final class AssetUrlRewriter {

    private static final Pattern LOCAL_FILES =
            Pattern.compile(
                    "(?i)^https?://(?:localhost|127\\.0\\.0\\.1)(?::\\d+)?/files/(.+)$");

    private static final Pattern LOCAL_HOST =
            Pattern.compile("(?i)^https?://(?:localhost|127\\.0\\.0\\.1)(?::\\d+)?(?:/.*)?$");

    private AssetUrlRewriter() {}

    public static boolean isLocalDevFilesUrl(String url) {
        if (url == null || url.isBlank()) {
            return false;
        }
        return LOCAL_FILES.matcher(url.strip()).matches();
    }

    /** True when {@code PUBLIC_FILES_BASE_URL} itself points at a local API (misconfigured). */
    public static boolean isLocalDevPublicBase(String publicBase) {
        if (publicBase == null || publicBase.isBlank()) {
            return false;
        }
        return LOCAL_HOST.matcher(publicBase.strip().replaceAll("/$", "")).matches();
    }

    /**
     * R2/CDN base only — blank when unset or mistakenly set to localhost.
     */
    public static String effectivePublicBase(String publicBase) {
        String base = Optional.ofNullable(publicBase).orElse("").strip().replaceAll("/$", "");
        if (base.isBlank() || isLocalDevPublicBase(base)) {
            return "";
        }
        return base;
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
            // Never keep a localhost absolute URL as the public asset host.
            if (isLocalDevPublicBase(trimmed)) {
                return "";
            }
            return trimmed;
        }
        while (trimmed.startsWith("/")) {
            trimmed = trimmed.substring(1);
        }
        // Drop a leading "files/" segment from local API paths.
        if (trimmed.regionMatches(true, 0, "files/", 0, 6)) {
            trimmed = trimmed.substring(6);
        }
        String base = effectivePublicBase(publicBase);
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