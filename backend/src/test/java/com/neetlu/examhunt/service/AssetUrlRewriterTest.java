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
        assertThat(AssetUrlRewriter.isLocalDevFilesUrl("https://cdn.example/2025/diagrams/x.webp"))
                .isFalse();
    }
}
