package com.neetlu.examhunt.service.llm;

/** Known behavior flags for a routed LLM model id. */
public record LlmModelCapabilities(
        String modelId,
        boolean supportsJsonMode,
        boolean supportsJsonSchema,
        boolean reasoningModel,
        boolean supportsToolCalling) {

    public static LlmModelCapabilities conservativeDefault(String modelId) {
        return new LlmModelCapabilities(modelId, false, false, false, false);
    }
}
