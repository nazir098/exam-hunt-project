package com.neetlu.examhunt.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.neetlu.examhunt.config.AppProperties;
import com.neetlu.examhunt.service.llm.LlmCompletionOptions;
import com.neetlu.examhunt.service.llm.LlmModelCapabilities;
import com.neetlu.examhunt.service.llm.LlmModelCapabilityRegistry;
import com.neetlu.examhunt.service.llm.LlmResponseParser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** OpenAI-compatible chat client (FreeLLMAPI, OpenRouter, etc.). */
@Service
public class FreeLlmClient {

    private static final Logger log = LoggerFactory.getLogger(FreeLlmClient.class);
    private static final String DEFAULT_BASE_URL = "http://localhost:3001/v1";

    /** Raw assistant text plus optional parsed JSON payload (single LLM call). */
    public record StructuredCompletion(String rawText, String jsonPayload) {
        public boolean hasJson() {
            return jsonPayload != null && !jsonPayload.isBlank();
        }
    }

    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;
    private final LlmModelCapabilityRegistry capabilityRegistry;
    private final RestTemplate restTemplate = new RestTemplate();

    public FreeLlmClient(
            AppProperties appProperties,
            ObjectMapper objectMapper,
            LlmModelCapabilityRegistry capabilityRegistry) {
        this.appProperties = appProperties;
        this.objectMapper = objectMapper;
        this.capabilityRegistry = capabilityRegistry;
    }

    public boolean isConfigured() {
        String key = appProperties.llmApiKey();
        return key != null && !key.isBlank();
    }

    public boolean isEnabled() {
        return appProperties.aiPracticeEnabled() && isConfigured();
    }

    public LlmModelCapabilities capabilitiesForConfiguredModel() {
        return capabilityRegistry.resolve(configuredModel());
    }

    public String complete(String systemPrompt, String userPrompt, double temperature, int maxTokens) {
        return complete(systemPrompt, userPrompt, LlmCompletionOptions.text(temperature, maxTokens));
    }

    public String complete(
            String systemPrompt, String userPrompt, double temperature, Double topP, int maxTokens) {
        return complete(systemPrompt, userPrompt, LlmCompletionOptions.text(temperature, topP, maxTokens));
    }

    public String complete(String systemPrompt, String userPrompt, LlmCompletionOptions options) {
        CompletionResult result = completeInternal(systemPrompt, userPrompt, options, true);
        if (result.text().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "LLM returned empty content");
        }
        return result.text();
    }

    /**
     * Single capability-aware LLM call with optional structured output.
     * Does not retry — callers should extract from {@code rawText} before re-prompting.
     */
    public StructuredCompletion completeStructured(
            String systemPrompt,
            String userPrompt,
            LlmCompletionOptions baseOptions,
            String jsonSchemaName,
            Map<String, Object> jsonSchema) {
        LlmCompletionOptions options = buildJsonOptions(baseOptions, jsonSchemaName, jsonSchema);
        CompletionResult result = completeInternal(systemPrompt, userPrompt, options, true);
        String raw = result.text();
        String json = LlmResponseParser.extractJsonObject(raw);
        if (json != null && LlmResponseParser.isValidJson(json, objectMapper)) {
            return new StructuredCompletion(raw, json);
        }
        if (result.capabilities().supportsJsonMode() || result.capabilities().supportsJsonSchema()) {
            log.warn(
                    "LLM JSON parse failed model={} caps={} — caller should try plain-text extraction",
                    result.actualModel(),
                    result.capabilities());
        }
        return new StructuredCompletion(raw, null);
    }

    /**
     * @deprecated Prefer {@link #completeStructured} with caller-side extraction and retry.
     */
    public String completeJson(
            String systemPrompt,
            String userPrompt,
            LlmCompletionOptions baseOptions,
            String jsonSchemaName,
            Map<String, Object> jsonSchema) {
        StructuredCompletion result =
                completeStructured(systemPrompt, userPrompt, baseOptions, jsonSchemaName, jsonSchema);
        return result.hasJson() ? result.jsonPayload() : "";
    }

    private LlmCompletionOptions buildJsonOptions(
            LlmCompletionOptions base, String jsonSchemaName, Map<String, Object> jsonSchema) {
        LlmModelCapabilities caps = capabilityRegistry.resolve(configuredModel());
        if (caps.supportsJsonSchema() && jsonSchemaName != null && jsonSchema != null) {
            return LlmCompletionOptions.jsonSchema(
                    base.temperature(), base.maxTokens(), jsonSchemaName, jsonSchema);
        }
        if (caps.supportsJsonMode() || base.requestJsonObject()) {
            return LlmCompletionOptions.jsonObject(base.temperature(), base.maxTokens());
        }
        return base;
    }

    private CompletionResult completeInternal(
            String systemPrompt,
            String userPrompt,
            LlmCompletionOptions options,
            boolean allowStructuredOutputFallback) {
        if (!isConfigured()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "LLM is not configured — set OPENAI_API_KEY and OPENAI_BASE_URL in .env");
        }

        String requestedModel = configuredModel();
        LlmModelCapabilities caps = capabilityRegistry.resolve(requestedModel);
        String effectiveUser = caps.reasoningModel() ? reinforceUserPrompt(userPrompt) : userPrompt;

        Map<String, Object> body = buildRequestBody(requestedModel, systemPrompt, effectiveUser, options, caps);

        try {
            return postCompletion(body, requestedModel, caps, systemPrompt, effectiveUser, options);
        } catch (HttpClientErrorException ex) {
            if (allowStructuredOutputFallback && body.containsKey("response_format")) {
                log.warn(
                        "LLM structured output rejected (HTTP {}), retrying without response_format",
                        ex.getStatusCode().value());
                Map<String, Object> plain =
                        buildRequestBody(requestedModel, systemPrompt, effectiveUser, options, caps);
                plain.remove("response_format");
                return postCompletion(plain, requestedModel, caps, systemPrompt, effectiveUser, options);
            }
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "LLM API returned " + ex.getStatusCode());
        }
    }

    private CompletionResult postCompletion(
            Map<String, Object> body,
            String requestedModel,
            LlmModelCapabilities requestCaps,
            String systemPrompt,
            String userPrompt,
            LlmCompletionOptions options)
            throws HttpClientErrorException {
        String baseUrl = resolvedBaseUrl();
        String url = baseUrl.replaceAll("/$", "") + "/chat/completions";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(appProperties.llmApiKey());

        log.info(
                """
                LLM → request url={} model={} temperature={} maxTokens={} jsonMode={} reasoning={}
                --- system ---
                {}
                --- user ---
                {}
                """,
                url,
                body.get("model"),
                options.temperature(),
                options.maxTokens(),
                body.containsKey("response_format"),
                requestCaps.reasoningModel(),
                systemPrompt,
                userPrompt);

        ResponseEntity<String> response =
                restTemplate.postForEntity(url, new HttpEntity<>(body, headers), String.class);
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            log.warn("LLM ← HTTP {} body={}", response.getStatusCode(), response.getBody());
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "LLM API returned " + response.getStatusCode());
        }

        try {
            JsonNode root = objectMapper.readTree(response.getBody());
            String actualModel = LlmResponseParser.actualModelId(root, requestedModel);
            LlmModelCapabilities actualCaps = capabilityRegistry.resolve(actualModel);
            String text = LlmResponseParser.extractAssistantContent(root);

            if (text.isBlank()) {
                log.warn(
                        "LLM ← empty message.content model={} reasoningModel={} (reasoning fields ignored)",
                        actualModel,
                        actualCaps.reasoningModel());
            }

            JsonNode usage = root.path("usage");
            if (!usage.isMissingNode()) {
                log.info(
                        "LLM ← model={} tokens prompt={} completion={} total={}\n--- assistant ---\n{}",
                        actualModel,
                        usage.path("prompt_tokens").asInt(-1),
                        usage.path("completion_tokens").asInt(-1),
                        usage.path("total_tokens").asInt(-1),
                        text.isBlank() ? "(empty)" : text);
            } else {
                log.info("LLM ← model={}\n--- assistant ---\n{}", actualModel, text.isBlank() ? "(empty)" : text);
            }
            return new CompletionResult(text, actualModel, actualCaps);
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("LLM ← parse error: {}", ex.getMessage());
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "LLM response parse failed: " + ex.getMessage());
        }
    }

    private Map<String, Object> buildRequestBody(
            String model,
            String systemPrompt,
            String userPrompt,
            LlmCompletionOptions options,
            LlmModelCapabilities caps) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put(
                "messages",
                List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userPrompt)));
        body.put("temperature", options.temperature());
        if (options.topP() != null) {
            body.put("top_p", options.topP());
        }
        body.put("max_tokens", options.maxTokens());

        Map<String, Object> responseFormat = responseFormatFor(options, caps);
        if (responseFormat != null) {
            body.put("response_format", responseFormat);
        }
        return body;
    }

    private static Map<String, Object> responseFormatFor(
            LlmCompletionOptions options, LlmModelCapabilities caps) {
        if (caps.supportsJsonSchema()
                && options.jsonSchemaName() != null
                && options.jsonSchema() != null) {
            return Map.of(
                    "type", "json_schema",
                    "json_schema",
                            Map.of(
                                    "name", options.jsonSchemaName(),
                                    "strict", true,
                                    "schema", options.jsonSchema()));
        }
        if ((caps.supportsJsonMode() || options.requestJsonObject())
                && options.jsonSchema() == null) {
            return Map.of("type", "json_object");
        }
        return null;
    }

    private static String reinforceUserPrompt(String userPrompt) {
        return userPrompt
                + """

                IMPORTANT: Put your final answer in the normal assistant message body only.
                Do not use reasoning-only fields. Follow all output format rules exactly.
                """;
    }

    private String configuredModel() {
        String model = appProperties.llmModel();
        if (model == null || model.isBlank()) {
            return "auto";
        }
        return model.strip();
    }

    private String resolvedBaseUrl() {
        String baseUrl = appProperties.llmBaseUrl();
        if (baseUrl == null || baseUrl.isBlank()) {
            return DEFAULT_BASE_URL;
        }
        return baseUrl;
    }

    private record CompletionResult(String text, String actualModel, LlmModelCapabilities capabilities) {}
}
