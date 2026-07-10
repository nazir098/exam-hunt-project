package com.neetlu.examhunt.service;

import com.fasterxml.jackson.databind.JsonNode;
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
    void skipsUnapprovedStructuredDraftFromMetadata() throws Exception {
        String json =
                """
                {
                  "render_mode": "hybrid",
                  "content_render_approved": false,
                  "question_stem": "dy x x x g broken mineru line breaks",
                  "options": [
                    {"id": "1", "text": "A"},
                    {"id": "2", "text": "B"},
                    {"id": "3", "text": "C"},
                    {"id": "4", "text": "D"}
                  ]
                }
                """;
        Question doc = new Question();

        boolean applied =
                service.applyStructuredContent(doc, objectMapper.readTree(json), "2025");

        assertThat(applied).isFalse();
        assertThat(doc.getRenderMode()).isEqualTo("image");
        assertThat(doc.getQuestionTextPreview()).isNull();
    }

    @Test
    void needsPyqDiskEnrichmentUntilStructuredTextIsStored() {
        Question pending = new Question();
        assertThat(service.needsPyqDiskEnrichment(pending)).isTrue();

        Question image = new Question();
        image.setRenderMode("image");
        image.setQuestionImageUrl("https://cdn.example/q.webp");
        assertThat(service.needsPyqDiskEnrichment(image)).isTrue();

        Question imageWithStemOnly = new Question();
        imageWithStemOnly.setRenderMode("image");
        imageWithStemOnly.setQuestionTextPreview("Stem without options");
        assertThat(service.needsPyqDiskEnrichment(imageWithStemOnly)).isTrue();

        Question structured = new Question();
        structured.setRenderMode("structured");
        structured.setQuestionTextPreview("Pick one");
        structured.setOptions(
                java.util.List.of(
                        option("1", "A"), option("2", "B"), option("3", "C"), option("4", "D")));
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

    @Test
    void applySolutionAssetsMapsSolutionPlacements() throws Exception {
        String json =
                """
                {
                  "solution_text_mineru": "{{asset:0}}\\nStep two\\n{{asset:1}}",
                  "solution_asset_placements": [
                    {"index": 0, "marker": "asset:0", "path": "diagrams/Q6_solution_fig_0.webp"},
                    {"index": 1, "marker": "asset:1", "path": "diagrams/Q6_solution_fig_1.webp"}
                  ],
                  "solution_mineru_diagrams": [
                    "diagrams/Q6_solution_fig_0.webp",
                    "diagrams/Q6_solution_fig_1.webp"
                  ]
                }
                """;
        JsonNode meta = objectMapper.readTree(json);
        Question doc = new Question();
        doc.setSolutionTextPreview("{{asset:0}}\nStep two\n{{asset:1}}");
        service.applySolutionAssets(doc, meta, "2025");
        assertThat(doc.getSolutionAssetPlacements()).hasSize(2);
        assertThat(doc.getSolutionAssetPlacements().get(0).getUrl())
                .contains("Q6_solution_fig_0.webp");
        assertThat(doc.getSolutionAssetPlacements().get(1).getUrl())
                .contains("Q6_solution_fig_1.webp");
    }

    @Test
    void neet2025Q11MineruSolutionSanitizesIdempotently() {
        String mineru =
                "{{asset:0}} Given, $I = 2\\mathrm{A}$ and $\\frac{di}{dt} = +1\\mathrm{A/s}$\n"
                        + "$$\\begin{array}{l} V_{A} - L \\frac{di}{dt} - 5 - i \\times 2 = V_B\\\\ "
                        + "\\Rightarrow V_{A} - 1 \\times 1 - 5 - 2 \\times 2 = V_B\\\\ "
                        + "\\Rightarrow V_{A} - V_{B} = 10 \\mathrm{volt} \\end{array}$$";
        String once = AiTextNormalizer.sanitizeSolutionText(mineru);
        String twice = AiTextNormalizer.sanitizeSolutionText(once);
        assertThat(once).contains("\\begin{array}{l}");
        assertThat(once).doesNotContain("\\begin{array{l}");
        assertThat(twice).contains("\\begin{array}{l}");
        assertThat(twice).doesNotContain("\\begin{array{l}");
    }

    @Test
    void needsSolutionMetadataRefreshPrefersMineruOverStalePdfText() throws Exception {
        String json =
                """
                {
                  "solution_format_source": "mineru",
                  "solution_text": "Sol. 1Y A B = + broken pdf ocr",
                  "solution_text_mineru": "$Y_1=\\\\overline{A+B}$\\n\\n$Y_2=\\\\overline{A\\\\cdot B}$"
                }
                """;
        JsonNode meta = objectMapper.readTree(json);
        Question doc = new Question();
        doc.setSolutionTextPreview("");

        assertThat(service.needsSolutionMetadataRefresh(doc, meta)).isTrue();

        String expected =
                AiTextNormalizer.sanitizeSolutionText(
                        QuestionMetadataStore.resolveSolutionText(meta));
        assertThat(expected).contains("overline");
        assertThat(expected).doesNotContain("broken pdf ocr");
    }

    private static com.neetlu.examhunt.model.McqOption option(String id, String text) {
        com.neetlu.examhunt.model.McqOption row = new com.neetlu.examhunt.model.McqOption();
        row.setId(id);
        row.setText(text);
        return row;
    }
}
