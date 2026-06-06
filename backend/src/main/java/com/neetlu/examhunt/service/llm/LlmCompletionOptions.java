package com.neetlu.examhunt.service.llm;

import java.util.Map;

public record LlmCompletionOptions(
        double temperature,
        Double topP,
        int maxTokens,
        boolean requestJsonObject,
        String jsonSchemaName,
        Map<String, Object> jsonSchema) {

    public static LlmCompletionOptions text(double temperature, int maxTokens) {
        return new LlmCompletionOptions(temperature, null, maxTokens, false, null, null);
    }

    public static LlmCompletionOptions text(double temperature, Double topP, int maxTokens) {
        return new LlmCompletionOptions(temperature, topP, maxTokens, false, null, null);
    }

    public static LlmCompletionOptions jsonObject(double temperature, int maxTokens) {
        return new LlmCompletionOptions(temperature, null, maxTokens, true, null, null);
    }

    public static LlmCompletionOptions jsonSchema(
            double temperature, int maxTokens, String schemaName, Map<String, Object> schema) {
        return new LlmCompletionOptions(temperature, null, maxTokens, false, schemaName, schema);
    }
}
