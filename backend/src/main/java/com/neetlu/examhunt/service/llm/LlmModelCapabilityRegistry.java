package com.neetlu.examhunt.service.llm;

import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Maps routed model ids (OpenRouter, FreeLLMAPI, etc.) to capability flags.
 * Unknown or {@code auto} models use conservative defaults — prompt-only JSON enforcement.
 */
@Component
public class LlmModelCapabilityRegistry {

    private static final Pattern REASONING_MODEL =
            Pattern.compile(
                    "(^|/)(o1|o3|o4)(-|$)|"
                            + "deepseek[-/]?r1|deepseek[-/]?reasoner|"
                            + "qwq|"
                            + "reasoning|"
                            + "think(ing)?|"
                            + "gemini.*thinking|"
                            + "claude.*thinking",
                    Pattern.CASE_INSENSITIVE);

    private static final Map<String, LlmModelCapabilities> EXACT = Map.ofEntries(
            Map.entry(
                    "gpt-4o",
                    new LlmModelCapabilities("gpt-4o", true, true, false, true)),
            Map.entry(
                    "gpt-4o-mini",
                    new LlmModelCapabilities("gpt-4o-mini", true, true, false, true)),
            Map.entry(
                    "gpt-4o-2024-08-06",
                    new LlmModelCapabilities("gpt-4o-2024-08-06", true, true, false, true)),
            Map.entry(
                    "gpt-3.5-turbo",
                    new LlmModelCapabilities("gpt-3.5-turbo", true, false, false, true)),
            Map.entry(
                    "google/gemini-2.0-flash-001",
                    new LlmModelCapabilities("google/gemini-2.0-flash-001", true, false, false, true)),
            Map.entry(
                    "anthropic/claude-3.5-sonnet",
                    new LlmModelCapabilities("anthropic/claude-3.5-sonnet", true, false, false, true)),
            Map.entry(
                    "deepseek/deepseek-chat",
                    new LlmModelCapabilities("deepseek/deepseek-chat", true, false, false, true)),
            Map.entry(
                    "meta-llama/llama-3.1-70b-instruct",
                    new LlmModelCapabilities("meta-llama/llama-3.1-70b-instruct", true, false, false, true)));

    public LlmModelCapabilities resolve(String modelId) {
        if (modelId == null || modelId.isBlank() || "auto".equalsIgnoreCase(modelId.strip())) {
            return LlmModelCapabilities.conservativeDefault("auto");
        }
        String id = modelId.strip();
        LlmModelCapabilities exact = EXACT.get(id);
        if (exact != null) {
            return exact;
        }
        String lower = id.toLowerCase(Locale.ROOT);
        boolean reasoning = REASONING_MODEL.matcher(lower).find();
        if (reasoning) {
            return new LlmModelCapabilities(id, false, false, true, false);
        }
        if (lower.contains("gpt-4o") || lower.contains("gpt-4.1") || lower.contains("gpt-4.5")) {
            return new LlmModelCapabilities(id, true, true, false, true);
        }
        if (lower.contains("gpt-3.5") || lower.contains("claude") || lower.contains("gemini")) {
            return new LlmModelCapabilities(id, true, false, false, true);
        }
        if (lower.contains("llama") || lower.contains("mistral") || lower.contains("deepseek")) {
            return new LlmModelCapabilities(id, true, false, false, false);
        }
        return LlmModelCapabilities.conservativeDefault(id);
    }
}
