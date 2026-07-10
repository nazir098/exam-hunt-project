package com.neetlu.examhunt.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class QuestionMetadataStoreTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private final QuestionMetadataStore store = new QuestionMetadataStore(null, null, null);

    @Test
    void resolveSolutionTextUsesMineruFieldWhenSourceIsMineru() throws Exception {
        var meta =
                mapper.readTree(
                        """
                        {
                          "solution_format_source": "mineru",
                          "solution_text_mineru": "MinerU body",
                          "solution_text": "Synced copy"
                        }
                        """);
        assertEquals("MinerU body", QuestionMetadataStore.resolveSolutionText(meta));
    }

    @Test
    void resolveSolutionTextFallsBackToSyncedSolutionTextWhenMineruBlank() throws Exception {
        var meta =
                mapper.readTree(
                        """
                        {
                          "solution_format_source": "mineru",
                          "solution_text": "Synced copy"
                        }
                        """);
        assertEquals("Synced copy", QuestionMetadataStore.resolveSolutionText(meta));
    }

    @Test
    void resolveSolutionTextUsesLlmFieldWhenSourceIsLlm() throws Exception {
        var meta =
                mapper.readTree(
                        """
                        {
                          "solution_format_source": "llm",
                          "solution_text_llm": "LLM body",
                          "solution_text_mineru": "Stale mineru"
                        }
                        """);
        assertEquals("LLM body", QuestionMetadataStore.resolveSolutionText(meta));
    }

    @Test
    void resolveSolutionTextPrefersMineruOverPlainPdfWhenSourceUnset() throws Exception {
        var meta =
                mapper.readTree(
                        """
                        {
                          "solution_text": "Old PDF text",
                          "solution_text_mineru": "MinerU body"
                        }
                        """);
        assertEquals("MinerU body", QuestionMetadataStore.resolveSolutionText(meta));
    }

    @Test
    void solutionRawFieldFollowsFormatSource() throws Exception {
        var mineru = mapper.readTree("{\"solution_format_source\":\"mineru\"}");
        assertEquals("solution_text_mineru", store.solutionRawField(mineru));

        var llm = mapper.readTree("{\"solution_format_source\":\"llm\"}");
        assertEquals("solution_text_llm", store.solutionRawField(llm));
    }
}
