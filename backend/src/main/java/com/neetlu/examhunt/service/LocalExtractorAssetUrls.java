package com.neetlu.examhunt.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

/**
 * Prefer authenticated-free local extractor file URLs when {@code EXTRACTOR_ROOT} has the asset —
 * newly cropped diagrams are often not on R2 yet.
 */
public final class LocalExtractorAssetUrls {

    private LocalExtractorAssetUrls() {}

    /**
     * @return {@code /api/local-files/{folder}/{rel}?v={mtime}} when the file exists, else blank
     */
    public static String apiUrlIfPresent(Path outputRoot, String folder, String urlOrPath) {
        if (outputRoot == null || folder == null || folder.isBlank() || urlOrPath == null || urlOrPath.isBlank()) {
            return "";
        }
        String rel = toRelative(urlOrPath.strip(), folder);
        if (rel.isBlank() || rel.contains("..")) {
            return "";
        }
        Path root = outputRoot.resolve(folder).normalize();
        Path file = root.resolve(rel).normalize();
        if (!file.startsWith(root) || !Files.isRegularFile(file)) {
            return "";
        }
        long version = 0L;
        try {
            version = Files.getLastModifiedTime(file).toMillis();
        } catch (IOException ignored) {
            // ignore
        }
        return "/api/local-files/" + folder + "/" + rel + (version > 0 ? "?v=" + version : "");
    }

    public static Optional<Path> resolveOutputRoot(String extractorRoot) {
        if (extractorRoot == null || extractorRoot.isBlank()) {
            return Optional.empty();
        }
        // Matches QuestionMetadataStore: EXTRACTOR_ROOT/output
        Path output = Path.of(extractorRoot.strip()).resolve("output").normalize();
        return Optional.of(output);
    }

    /**
     * Append {@code ?v=mtime} when the local extractor file exists so CDN/browser caches refresh
     * after a re-crop that overwrote the same R2 key.
     */
    public static String appendMtimeQuery(
            String publicUrl, Path outputRoot, String folder, String urlOrPath) {
        if (publicUrl == null || publicUrl.isBlank() || outputRoot == null) {
            return publicUrl == null ? "" : publicUrl;
        }
        String rel = toRelative(urlOrPath == null || urlOrPath.isBlank() ? publicUrl : urlOrPath, folder);
        if (rel.isBlank()) {
            return publicUrl;
        }
        Path file = outputRoot.resolve(folder).resolve(rel).normalize();
        Path root = outputRoot.resolve(folder).normalize();
        if (!file.startsWith(root) || !Files.isRegularFile(file)) {
            return publicUrl;
        }
        long version = 0L;
        try {
            version = Files.getLastModifiedTime(file).toMillis();
        } catch (IOException ignored) {
            return publicUrl;
        }
        if (version <= 0) {
            return publicUrl;
        }
        String base = publicUrl;
        int hash = base.indexOf('#');
        String fragment = "";
        if (hash >= 0) {
            fragment = base.substring(hash);
            base = base.substring(0, hash);
        }
        int q = base.indexOf('?');
        if (q >= 0) {
            base = base.replaceAll("([?&])v=[^&]*", "$1").replaceAll("[?&]$", "");
            if (base.endsWith("?") || base.endsWith("&")) {
                base = base.substring(0, base.length() - 1);
            }
            // Drop empty query
            if (base.indexOf('?') >= 0 && base.indexOf('?') == base.length() - 1) {
                base = base.substring(0, base.length() - 1);
            }
            // Clean && and ?& leftovers
            base = base.replace("?&", "?").replaceAll("&&+", "&");
        }
        String sep = base.contains("?") ? "&" : "?";
        return base + sep + "v=" + version + fragment;
    }

    static String toRelative(String urlOrPath, String folder) {
        String trimmed = urlOrPath;
        if (trimmed.matches("(?i)^(?:https?://[^/]+)?/api/local-files/.+")) {
            trimmed =
                    trimmed.replaceFirst("(?i)^(?:https?://[^/]+)?/api/local-files/", "");
        } else if (AssetUrlRewriter.isLocalDevFilesUrl(trimmed)) {
            trimmed =
                    trimmed.replaceFirst(
                            "(?i)^https?://(?:localhost|127\\.0\\.0\\.1)(?::\\d+)?/files/", "");
        } else if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            int idx = trimmed.indexOf("/" + folder + "/");
            if (idx < 0) {
                // Absolute CDN URL — keep path after host: /2025/diagrams/...
                int scheme = trimmed.indexOf("://");
                int pathStart = scheme >= 0 ? trimmed.indexOf('/', scheme + 3) : -1;
                if (pathStart < 0) {
                    return "";
                }
                trimmed = trimmed.substring(pathStart + 1);
            } else {
                trimmed = trimmed.substring(idx + 1);
            }
        }
        while (trimmed.startsWith("/")) {
            trimmed = trimmed.substring(1);
        }
        if (trimmed.regionMatches(true, 0, "files/", 0, 6)) {
            trimmed = trimmed.substring(6);
        }
        if (trimmed.startsWith(folder + "/")) {
            trimmed = trimmed.substring(folder.length() + 1);
        }
        // Drop query/hash from relative paths.
        int q = trimmed.indexOf('?');
        if (q >= 0) {
            trimmed = trimmed.substring(0, q);
        }
        int hash = trimmed.indexOf('#');
        if (hash >= 0) {
            trimmed = trimmed.substring(0, hash);
        }
        return trimmed;
    }
}
