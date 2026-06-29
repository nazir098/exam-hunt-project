package com.neetlu.examhunt.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.neetlu.examhunt.config.AppProperties;
import com.neetlu.examhunt.model.Question;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class StructuredContentServiceTest {

    private StructuredContentService service;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        AppProperties props =
                new AppProperties(
                        "",
                        "",
                        "",
                        "https://cdn.example",
                        "",
                        "",
                        "",
                        "",
                        "test-secret-test-secret-test-secret-32b",
                        168L,
                        false,
                        "",
                        "",
                        "",
                        true,
                        false,
                        "");
        service = new StructuredContentService(props);
    }

    @Test
    void appliesStructuredTextAndOptionsFromMetadata() throws Exception {
        String json =
                """
                {
                  "render_mode": "structured",
                  "question_stem": "A parallel plate capacitor is charged.",
                  "options": [
                    {"id": "1", "text": "Zero"},
                    {"id": "2", "text": "Constant"},
                    {"id": "3", "text": "Non-zero"},
                    {"id": "4", "text": "Outside only"}
                  ]
                }
                """;
        Question doc = new Question();
        doc.setQuestionId("NEET_2025_Q26");

        boolean applied =
                service.applyStructuredContent(doc, objectMapper.readTree(json), "2025");

        assertThat(applied).isTrue();
        assertThat(doc.getRenderMode()).isEqualTo("structured");
        assertThat(doc.getQuestionTextPreview()).contains("parallel plate capacitor");
        assertThat(doc.getOptions()).hasSize(4);
        assertThat(doc.getOptions().get(0).getText()).isEqualTo("Zero");
    }

    @Test
    void imageModeFallsBackWithoutApplyingTextLayout() throws Exception {
        String json =
                """
                {
                  "render_mode": "image",
                  "question_stem": "Stem with {{asset:0}}",
                  "options": []
                }
                """;
        Question doc = new Question();
        doc.setQuestionImageUrl("https://cdn.example/q.webp");

        boolean applied =
                service.applyStructuredContent(doc, objectMapper.readTree(json), "2025");

        assertThat(applied).isFalse();
        assertThat(doc.getRenderMode()).isEqualTo("image");
        assertThat(doc.getOptions()).isNull();
        assertThat(doc.getQuestionImageUrl()).isEqualTo("https://cdn.example/q.webp");
    }

    @Test
    void hybridWithInlineAssetsResolvesDiagramPlacements() throws Exception {
        String json =
                """
                {
                  "render_mode": "hybrid",
                  "question_stem": "Circuit question\\n{{asset:0}}",
                  "options": [
                    {"id": "1", "text": "A"},
                    {"id": "2", "text": "B"},
                    {"id": "3", "text": "C"},
                    {"id": "4", "text": "D"}
                  ],
                  "question_asset_placements": [
                    {
                      "index": 0,
                      "marker": "asset:0",
                      "path": "diagrams/NEET_2025_Q11_fig_0.webp"
                    }
                  ],
                  "mineru_diagrams": ["diagrams/NEET_2025_Q11_fig_0.webp"]
                }
                """;
        Question doc = new Question();

        boolean applied =
                service.applyStructuredContent(doc, objectMapper.readTree(json), "2025");

        assertThat(applied).isTrue();
        assertThat(doc.getRenderMode()).isEqualTo("hybrid");
        assertThat(doc.getQuestionTextPreview()).contains("{{asset:0}}");
        assertThat(doc.getAssetPlacements()).hasSize(1);
        assertThat(doc.getAssetPlacements().get(0).getUrl())
                .isEqualTo("https://cdn.example/2025/diagrams/NEET_2025_Q11_fig_0.webp");
        assertThat(doc.getQuestionImageUrl()).isEmpty();
        assertThat(doc.isHasDiagram()).isTrue();
    }

    @Test
    void needsPyqDiskEnrichmentOnlyWhenRenderModeUnset() {
        Question pending = new Question();
        assertThat(service.needsPyqDiskEnrichment(pending)).isTrue();

        Question image = new Question();
        image.setRenderMode("image");
        assertThat(service.needsPyqDiskEnrichment(image)).isFalse();

        Question structured = new Question();
        structured.setRenderMode("structured");
        assertThat(service.needsPyqDiskEnrichment(structured)).isFalse();
    }

    @Test
    void needsVariantDiskEnrichmentSkipsCompleteVariants() {
        Question bare = new Question();
        assertThat(service.needsVariantDiskEnrichment(bare)).isTrue();

        Question withOptions = new Question();
        withOptions.setOptions(
                java.util.List.of(
                        option("1", "A"), option("2", "B"), option("3", "C"), option("4", "D")));
        assertThat(service.needsVariantDiskEnrichment(withOptions)).isFalse();

        Question imageOnly = new Question();
        imageOnly.setQuestionImageUrl("https://cdn.example/q.webp");
        assertThat(service.needsVariantDiskEnrichment(imageOnly)).isFalse();
    }

    private static com.neetlu.examhunt.model.McqOption option(String id, String text) {
        com.neetlu.examhunt.model.McqOption row = new com.neetlu.examhunt.model.McqOption();
        row.setId(id);
        row.setText(text);
        return row;
    }
}
