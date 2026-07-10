package com.neetlu.examhunt.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.neetlu.examhunt.service.llm.LlmCompletionOptions;
import com.neetlu.examhunt.service.llm.LlmResponseParser;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** LLM repair of noisy MinerU / OCR raw text (mirrors pdf-qa-extractor llm_format.py). */
@Service
public class RawTextLatexFixService {

    private static final String RAW_TEXT_LATEX_FIX_PROMPT =
            """
            You repair noisy NEET/JEE exam text (PDF/OCR/MinerU) into clean LaTeX-ready plain text.

            Return JSON only:
            {
              "fixed_text": "the full corrected text"
            }

            Rules:
            - Fix broken LaTeX ($...$, $$...$$), OCR symbol errors, garbled fractions, and spurious line breaks.
            - Do NOT change meaning, numeric values, option ids, or which answer is correct.
            - Preserve MCQ structure: option lines (1) (2) (3) (4), statement labels A–E, Assertion/Reason wording if present.
            - Preserve {{asset:N}} inline figure markers exactly at sensible positions.
            - Return the entire input text corrected — not a summary.
            - Valid JSON only — no markdown fences.""";

    private static final String RAW_SOLUTION_LATEX_FIX_PROMPT =
            """
            You repair noisy NEET/JEE solution text (PDF/OCR/MinerU) into clean LaTeX-ready plain text.

            Return JSON only:
            {
              "fixed_text": "the full corrected solution text"
            }

            Rules:
            - Fix broken LaTeX, OCR errors, and random line breaks; keep worked steps in logical order.
            - Do NOT invent steps or change the final answer.
            - Preserve {{asset:N}} markers exactly where they appear.
            - Return the entire input text corrected — not a summary.
            - Valid JSON only — no markdown fences.""";

    private final FreeLlmClient llm;
    private final ObjectMapper objectMapper;

    public RawTextLatexFixService(FreeLlmClient llm, ObjectMapper objectMapper) {
        this.llm = llm;
        this.objectMapper = objectMapper;
    }

    public String fixRawText(String rawText, JsonNode meta, String target) {
        if (rawText == null || rawText.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No text to fix");
        }
        if (!llm.isConfigured()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "LLM is not configured — set OPENAI_API_KEY in .env");
        }
        String normalizedTarget = "solution".equalsIgnoreCase(target) ? "solution" : "question";
        String userMessage = buildUserMessage(rawText, meta, normalizedTarget);
        FreeLlmClient.StructuredCompletion result =
                llm.completeStructured(
                        "You are a precise LaTeX/OCR repair assistant for NEET/JEE exam content.",
                        userMessage,
                        LlmCompletionOptions.jsonObject(0.2, 8192),
                        "raw_text_fix",
                        jsonSchema());
        String payload = result.jsonPayload();
        if (payload == null || payload.isBlank()) {
            payload = result.rawText();
        }
        if (payload == null || payload.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "LLM returned no JSON fixed_text");
        }
        String fixed =
                LlmResponseParser.extractFixedText(payload, objectMapper)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.BAD_GATEWAY,
                                                "LLM returned no JSON fixed_text"));
        if (looksTruncated(rawText, fixed)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "LLM returned truncated text — edit manually or try again");
        }
        return fixed;
    }

    private String buildUserMessage(String rawText, JsonNode meta, String target) {
        String prompt = "solution".equals(target) ? RAW_SOLUTION_LATEX_FIX_PROMPT : RAW_TEXT_LATEX_FIX_PROMPT;
        StringBuilder sb = new StringBuilder();
        sb.append(prompt)
                .append("\n\ntarget: ")
                .append(target)
                .append("\nanswer key: ")
                .append(QuestionMetadataStore.text(meta, "answer"));
        if ("question".equals(target)) {
            sb.append("\nhas_diagram: ").append(meta.path("has_diagram").asBoolean(false));
            sb.append("\nhas_equation: ").append(meta.path("has_equation").asBoolean(false));
        } else {
            sb.append("\nhas_diagram: ").append(meta.path("has_diagram").asBoolean(false));
        }
        sb.append("\n\n=== TEXT TO FIX ===\n").append(rawText.strip());
        return sb.toString();
    }

    private static Map<String, Object> jsonSchema() {
        Map<String, Object> props = new LinkedHashMap<>();
        props.put("fixed_text", Map.of("type", "string"));
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        schema.put("properties", props);
        schema.put("required", java.util.List.of("fixed_text"));
        schema.put("additionalProperties", false);
        return schema;
    }

    private static boolean looksTruncated(String source, String fixed) {
        String in = source == null ? "" : source.strip();
        String out = fixed == null ? "" : fixed.strip();
        if (in.length() < 80) {
            return false;
        }
        if (in.contains("\\begin{") && !out.contains("\\begin{")) {
            return true;
        }
        if (in.contains("\\end{") && !out.contains("\\end{")) {
            return true;
        }
        return out.length() < in.length() * 0.55;
    }
}
