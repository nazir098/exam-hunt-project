package com.neetlu.examhunt.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class LocalExtractorAssetUrlsTest {

    @TempDir Path temp;

    @Test
    void buildsLocalApiUrlWhenFileExists() throws Exception {
        Path diagrams = temp.resolve("2025").resolve("diagrams");
        Files.createDirectories(diagrams);
        Path file = diagrams.resolve("NEET_2025_Q19_fig_0.webp");
        Files.writeString(file, "fake");

        String url =
                LocalExtractorAssetUrls.apiUrlIfPresent(
                        temp, "2025", "diagrams/NEET_2025_Q19_fig_0.webp");
        assertTrue(url.startsWith("/api/local-files/2025/diagrams/NEET_2025_Q19_fig_0.webp?v="));
    }

    @Test
    void resolvesRelativeFromCdnUrl() throws Exception {
        Path diagrams = temp.resolve("2025").resolve("diagrams");
        Files.createDirectories(diagrams);
        Files.writeString(diagrams.resolve("x.webp"), "x");

        String url =
                LocalExtractorAssetUrls.apiUrlIfPresent(
                        temp,
                        "2025",
                        "https://pub.example/2025/diagrams/x.webp");
        assertTrue(url.startsWith("/api/local-files/2025/diagrams/x.webp"));
    }

    @Test
    void blankWhenMissing() {
        assertEquals(
                "",
                LocalExtractorAssetUrls.apiUrlIfPresent(
                        temp, "2025", "diagrams/missing.webp"));
    }
}
