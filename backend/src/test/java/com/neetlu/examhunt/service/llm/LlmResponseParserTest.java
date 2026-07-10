package com.neetlu.examhunt.service.llm;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LlmResponseParserTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void extractFixedTextRepairsInvalidLatexJsonEscapes() {
        String broken =
                """
                {
                  "fixed_text": "Given, $I = 2\\mathrm{A}$ and $\\frac{di}{dt} = +1\\mathrm{A/s}$"
                }
                """;
        var fixed = LlmResponseParser.extractFixedText(broken, mapper);
        assertTrue(fixed.isPresent(), () -> fixed.toString());
        assertTrue(fixed.get().contains("\\mathrm{A}"), () -> fixed.get());
        assertTrue(fixed.get().contains("\\frac{di}{dt}"), () -> fixed.get());
    }

    @Test
    void extractFixedTextPreservesNeqCommand() {
        String broken = "{\"fixed_text\": \"$\\\\neq 0$ and $\\\\nu = c$\"}";
        var fixed = LlmResponseParser.extractFixedText(broken, mapper);
        assertTrue(fixed.isPresent());
        assertTrue(fixed.get().contains("\\neq"), () -> fixed.get());
        assertTrue(fixed.get().contains("\\nu"), () -> fixed.get());
    }

    @Test
    void extractFixedTextFromMinimalBrokenJson() {
        String broken = "{\"fixed_text\":\"$\\mathrm{A}$\"}";
        assertFalse(LlmResponseParser.isValidJson(broken, mapper));
        var fixed = LlmResponseParser.extractFixedText(broken, mapper);
        assertTrue(fixed.isPresent(), () -> "expected extractFixedText to recover mathrm");
        assertTrue(fixed.get().contains("\\mathrm{A}"), () -> fixed.get());
    }
}
