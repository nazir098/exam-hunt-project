package com.neetlu.examhunt.service;

import com.neetlu.examhunt.model.Question;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SeoTextUtilTest {

    @Test
    void stripsLatexAndAssetMarkers() {
        String raw =
                "Find $S_{\\mathrm{N}}2$ rate for {{asset:1}} given $\\text{Ba}^{2+}$ formation.";
        assertThat(SeoTextUtil.toPlainText(raw))
                .isEqualTo("Find S N 2 rate for given Ba 2+ formation.");
    }

    @Test
    void excerptTruncatesPlainText() {
        String longText = "A".repeat(200);
        assertThat(SeoTextUtil.excerpt(longText, 40)).hasSize(40).endsWith("...");
    }
}
