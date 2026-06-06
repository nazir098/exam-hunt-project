package com.neetlu.examhunt.service.llm;

import java.util.Map;

/** JSON schemas for structured LLM outputs when the model supports json_schema mode. */
public final class LlmJsonSchemas {

    private LlmJsonSchemas() {}

    public static final Map<String, Object> HINT_STEPS =
            Map.of(
                    "type", "object",
                    "properties",
                            Map.of(
                                    "steps",
                                    Map.of(
                                            "type", "array",
                                            "items", Map.of("type", "string"),
                                            "minItems", 3,
                                            "maxItems", 3)),
                    "required", java.util.List.of("steps"),
                    "additionalProperties", false);

    public static final Map<String, Object> FORMULAS =
            Map.of(
                    "type", "object",
                    "properties",
                            Map.of(
                                    "formulas",
                                    Map.of(
                                            "type", "array",
                                            "maxItems", 2,
                                            "items",
                                            Map.of(
                                                    "type", "object",
                                                    "properties",
                                                            Map.of(
                                                                    "name", Map.of("type", "string"),
                                                                    "equation", Map.of("type", "string"),
                                                                    "whenToUse", Map.of("type", "string")),
                                                    "required",
                                                            java.util.List.of("name", "equation", "whenToUse"),
                                                    "additionalProperties", false))),
                    "required", java.util.List.of("formulas"),
                    "additionalProperties", false);

    public static final String JSON_RETRY_SUFFIX =
            """

            Return ONLY valid JSON. No markdown. No code fences. No explanation before or after the JSON.
            """;
}
