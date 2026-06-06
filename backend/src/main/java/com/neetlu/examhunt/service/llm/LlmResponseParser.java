package com.neetlu.examhunt.service.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Normalizes assistant payloads from heterogeneous OpenRouter / reasoning models. */
public final class LlmResponseParser {

    private static final Pattern JSON_FENCE =
            Pattern.compile("(?is)^\\s*```(?:json)?\\s*\\R?(.*?)\\R?```\\s*$");

    private static final Pattern ANALYSIS_PREAMBLE =
            Pattern.compile(
                    "(?is)^\\s*(?:(?:let me (?:analyze|break down|explain)|based on the (?:given )?question)[^.!?\\n]*[.!?]\\s*)+");

    private static final Pattern HINT_LINE =
            Pattern.compile("(?im)^hint\\s*([123])\\s*[:.)\\-–—]?\\s*(.+)$");

    private static final Pattern STEP_LINE =
            Pattern.compile("(?im)^step\\s*([123])\\s*[:.)\\-–—]?\\s*(.+)$");

    private static final Pattern NUMBERED_LINE =
            Pattern.compile("^(?:hint\\s*)?([123])\\s*[.)\\]\\-–—]\\s*(.+)$", Pattern.CASE_INSENSITIVE);

    private static final Pattern HINT_BLOCKS =
            Pattern.compile(
                    "(?is)hint\\s*1\\s*[:.)\\-–—]?\\s*(.+?)\\s*hint\\s*2\\s*[:.)\\-–—]?\\s*(.+?)\\s*hint\\s*3\\s*[:.)\\-–—]?\\s*(.+?)$");

    private LlmResponseParser() {}

    /**
     * Primary assistant text — always {@code message.content}. Reasoning fields are ignored.
     */
    public static String extractAssistantContent(JsonNode root) {
        if (root == null || root.isMissingNode()) {
            return "";
        }
        JsonNode message = root.path("choices").path(0).path("message");
        return textOrEmpty(message.path("content")).trim();
    }

    public static String actualModelId(JsonNode root, String requestedModel) {
        if (root == null || root.isMissingNode()) {
            return requestedModel;
        }
        String fromResponse = root.path("model").asText("").strip();
        return fromResponse.isBlank() ? requestedModel : fromResponse;
    }

    /** Strip markdown fences and trim before JSON parsing. */
    public static String cleanJsonPayload(String raw) {
        if (raw == null) {
            return "";
        }
        String t = raw.strip();
        var fence = JSON_FENCE.matcher(t);
        if (fence.matches()) {
            t = fence.group(1).strip();
        }
        t = t.replaceAll("(?m)^```(?:json)?\\s*$", "").strip();
        return t;
    }

    public static String extractJsonObject(String raw) {
        String cleaned = cleanJsonPayload(raw);
        if (cleaned.isBlank()) {
            return null;
        }
        int start = cleaned.indexOf('{');
        int end = cleaned.lastIndexOf('}');
        if (start < 0 || end <= start) {
            return null;
        }
        return cleaned.substring(start, end + 1).trim();
    }

    public static boolean isValidJson(String json, ObjectMapper mapper) {
        if (json == null || json.isBlank()) {
            return false;
        }
        try {
            mapper.readTree(json);
            return true;
        } catch (Exception ex) {
            return false;
        }
    }

    /** Strip reasoning preambles and cut to first Hint 1 / JSON block when present. */
    public static String stripAnalysisPreamble(String raw) {
        if (raw == null || raw.isBlank()) {
            return raw == null ? "" : raw;
        }
        String t = ANALYSIS_PREAMBLE.matcher(raw.strip()).replaceFirst("").strip();
        int hintStart = indexOfHintStart(t);
        if (hintStart > 0) {
            t = t.substring(hintStart);
        }
        int jsonStart = t.indexOf('{');
        int hintIdx = indexOfHintStart(t);
        if (jsonStart >= 0 && (hintIdx < 0 || jsonStart < hintIdx)) {
            return t;
        }
        if (hintIdx >= 0) {
            return t.substring(hintIdx);
        }
        return t;
    }

    /**
     * Parse hint steps from JSON or plain text (Hint 1/2/3, STEP lines, numbered lists).
     * Returns up to three non-blank steps, or empty if nothing usable was found.
     */
    public static List<String> extractHintSteps(String raw, ObjectMapper mapper) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        String text = stripAnalysisPreamble(raw);

        List<String> fromJson = parseHintStepsJson(text, mapper);
        if (fromJson.size() >= 3) {
            return fromJson.subList(0, 3);
        }

        List<String> fromBlocks = parseHintBlocks(text);
        if (fromBlocks.size() >= 3) {
            return fromBlocks.subList(0, 3);
        }

        List<String> fromLabels = parseIndexedLines(text, HINT_LINE);
        if (fromLabels.size() >= 3) {
            return fromLabels.subList(0, 3);
        }

        fromLabels = parseIndexedLines(text, STEP_LINE);
        if (fromLabels.size() >= 3) {
            return fromLabels.subList(0, 3);
        }

        fromLabels = parseNumberedHintLines(text);
        if (fromLabels.size() >= 3) {
            return fromLabels.subList(0, 3);
        }

        return List.of();
    }

    private static List<String> parseHintStepsJson(String text, ObjectMapper mapper) {
        String json = text.strip().startsWith("{") ? text.strip() : extractJsonObject(text);
        if (json == null || !isValidJson(json, mapper)) {
            return List.of();
        }
        try {
            JsonNode arr = mapper.readTree(json).path("steps");
            if (!arr.isArray()) {
                return List.of();
            }
            List<String> steps = new ArrayList<>();
            arr.forEach(node -> {
                String s = node.asText("").strip();
                if (!s.isBlank()) {
                    steps.add(s);
                }
            });
            return steps;
        } catch (Exception ex) {
            return List.of();
        }
    }

    private static List<String> parseHintBlocks(String text) {
        Matcher m = HINT_BLOCKS.matcher(text.strip());
        if (!m.find()) {
            return List.of();
        }
        return List.of(m.group(1).strip(), m.group(2).strip(), m.group(3).strip());
    }

    private static List<String> parseIndexedLines(String text, Pattern pattern) {
        String[] slots = new String[3];
        for (String line : text.split("\n")) {
            Matcher m = pattern.matcher(line.strip());
            if (!m.matches()) {
                continue;
            }
            int n = Integer.parseInt(m.group(1));
            if (n >= 1 && n <= 3) {
                slots[n - 1] = m.group(2).strip();
            }
        }
        return filledSlots(slots);
    }

    private static List<String> parseNumberedHintLines(String text) {
        String[] slots = new String[3];
        for (String line : text.split("\n")) {
            Matcher m = NUMBERED_LINE.matcher(line.strip());
            if (!m.matches()) {
                continue;
            }
            int n = Integer.parseInt(m.group(1));
            if (n >= 1 && n <= 3) {
                slots[n - 1] = m.group(2).strip();
            }
        }
        return filledSlots(slots);
    }

    private static List<String> filledSlots(String[] slots) {
        List<String> out = new ArrayList<>();
        for (String slot : slots) {
            if (slot != null && !slot.isBlank()) {
                out.add(slot);
            }
        }
        return out.size() >= 3 ? List.of(slots[0], slots[1], slots[2]) : List.of();
    }

    private static int indexOfHintStart(String text) {
        Matcher m = Pattern.compile("(?i)hint\\s*1\\s*[:.)\\-–—]").matcher(text);
        return m.find() ? m.start() : -1;
    }

    private static String textOrEmpty(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return "";
        }
        if (node.isTextual()) {
            return node.asText("");
        }
        return node.toString();
    }
}
