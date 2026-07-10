package com.neetlu.examhunt.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.InputStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

class NormalizerGoldenTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @ParameterizedTest(name = "{0}")
    @MethodSource("fixtures")
    void goldenFixtures(String id, String pipeline, String input, JsonNode expected) throws Exception {
        String actual = runPipeline(pipeline, input);
        if (expected.has("expectedEquals")) {
            assertTrue(
                    actual.equals(expected.get("expectedEquals").asText()),
                    () -> id + " expected equals\nexp: " + expected.get("expectedEquals").asText() + "\nact: " + actual);
        }
        for (JsonNode fragment : expected.withArray("expectedContains")) {
            assertTrue(actual.contains(fragment.asText()), () -> id + " missing: " + fragment.asText() + "\n" + actual);
        }
        if (expected.has("expectedExcludes")) {
            for (JsonNode fragment : expected.withArray("expectedExcludes")) {
                assertFalse(actual.contains(fragment.asText()), () -> id + " should exclude: " + fragment.asText());
            }
        }
    }

    private static String runPipeline(String pipeline, String input) {
        return switch (pipeline) {
            case "stem" -> AiTextNormalizer.sanitizeQuestionStemText(input);
            case "option" -> AiTextNormalizer.sanitizeMcqOptionText(input);
            case "solution" -> AiTextNormalizer.sanitizeSolutionText(input);
            case "math" -> AiTextNormalizer.normalizeMathContent(input);
            default -> throw new IllegalArgumentException("unknown pipeline: " + pipeline);
        };
    }

    private static java.util.stream.Stream<org.junit.jupiter.params.provider.Arguments> fixtures() throws Exception {
        try (InputStream in =
                NormalizerGoldenTest.class.getResourceAsStream("/normalizer/golden-fixtures.json")) {
            JsonNode arr = MAPPER.readTree(in);
            java.util.List<org.junit.jupiter.params.provider.Arguments> rows = new java.util.ArrayList<>();
            for (JsonNode node : arr) {
                rows.add(
                        org.junit.jupiter.params.provider.Arguments.of(
                                node.get("id").asText(),
                                node.get("pipeline").asText(),
                                node.get("input").asText(),
                                node));
            }
            return rows.stream();
        }
    }

    @Test
    void mathRepairCoreMatchesNormalizerForJsonFrac() {
        String broken = "\u000crac{a}{b}";
        assertTrue(AiTextNormalizer.normalizeMathContent(broken).contains("\\frac{a}{b}"));
        assertTrue(MathRepairCore.repairJsonEscapedLatex(broken).contains("\\frac{a}{b}"));
    }
}
