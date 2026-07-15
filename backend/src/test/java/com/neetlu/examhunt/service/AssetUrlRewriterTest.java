package com.neetlu.examhunt.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class AssetUrlRewriterTest {

    @Test
    void rewritesLocalFilesUrlToPublicCdn() {
        String out =
                AssetUrlRewriter.rewrite(
                        "http://127.0.0.1:8080/files/2025/diagrams/NEET_2025_Q1_fig_0.webp",
                        "2025",
                        "https://cdn.example");
        assertThat(out).isEqualTo("https://cdn.example/2025/diagrams/NEET_2025_Q1_fig_0.webp");
    }

    @Test
    void leavesPublicHttpsUnchanged() {
        String src = "https://cdn.example/2025/diagrams/fig.webp";
        assertThat(AssetUrlRewriter.rewrite(src, "2025", "https://cdn.example")).isEqualTo(src);
    }

    @Test
    void detectsLocalDevFilesUrl() {
        assertThat(
                        AssetUrlRewriter.isLocalDevFilesUrl(
                                "http://127.0.0.1:8080/files/2025/diagrams/x.webp"))
                .isTrue();
        assertThat(
                        AssetUrlRewriter.isLocalDevFilesUrl(
                                "/api/local-files/2025/diagrams/NEET_2025_Q23_fig_0.webp?v=1"))
                .isTrue();
        assertThat(AssetUrlRewriter.isLocalDevFilesUrl("https://cdn.example/2025/diagrams/x.webp"))
                .isFalse();
    }

    @Test
    void rewritesLocalFilesApiPathToPublicCdn() {
        String out =
                AssetUrlRewriter.rewrite(
                        "/api/local-files/2025/diagrams/NEET_2025_Q23_fig_0.webp?v=1",
                        "2025",
                        "https://cdn.example");
        assertThat(out).isEqualTo("https://cdn.example/2025/diagrams/NEET_2025_Q23_fig_0.webp");
    }

    @Test
    void ignoresLocalhostPublicBase() {
        assertThat(AssetUrlRewriter.isLocalDevPublicBase("http://127.0.0.1:8081/files")).isTrue();
        assertThat(AssetUrlRewriter.effectivePublicBase("http://localhost:8080/files")).isEmpty();
        assertThat(
                        AssetUrlRewriter.rewrite(
                                "diagrams/x.webp", "2025", "http://127.0.0.1:8081/files"))
                .isEqualTo("diagrams/x.webp");
        assertThat(
                        AssetUrlRewriter.rewrite(
                                "http://127.0.0.1:8080/files/2025/diagrams/x.webp",
                                "2025",
                                "http://localhost:8081/files"))
                .isEqualTo("2025/diagrams/x.webp");
    }
}
