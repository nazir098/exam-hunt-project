package com.neetlu.examhunt.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.neetlu.examhunt.model.McqOption;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Parses AI variant JSON for {@code variant_type: matching} into structured list columns. */
final class MatchingVariantParser {

    private static final Pattern LIST_A_ITEM =
            Pattern.compile("\\b([A-D])\\.\\s*(.+?)(?=\\s+[A-D]\\.\\s|$)", Pattern.DOTALL);
    private static final Pattern ANSWER_MAPPING =
            Pattern.compile("\\b([A-D])\\s*[-–:]\\s*(.+?)(?=\\s*,\\s*[A-D]\\s*[-–:]|$)", Pattern.DOTALL);

    private MatchingVariantParser() {}

    record ParsedMatching(String intro, List<McqOption> listA, List<McqOption> listB) {}

    static boolean isMatchingVariant(JsonNode variant) {
        if (variant == null || variant.isMissingNode()) {
            return false;
        }
        String type = text(variant, "variant_type");
        if ("matching".equalsIgnoreCase(type)) {
            return true;
        }
        String format = text(variant, "question_format");
        return "matching".equalsIgnoreCase(format);
    }

    static ParsedMatching parse(JsonNode variant) {
        List<McqOption> explicitA = readOptionList(variant.path("list_a"));
        if (explicitA.isEmpty()) {
            explicitA = readOptionList(variant.path("match_list_a"));
        }
        List<McqOption> explicitB = readOptionList(variant.path("list_b"));
        if (explicitB.isEmpty()) {
            explicitB = readOptionList(variant.path("match_list_b"));
        }

        String questionText = text(variant, "question_text_preview");
        if (questionText.isBlank()) {
            questionText = text(variant, "question_text");
        }

        List<McqOption> listA = explicitA.isEmpty() ? parseListA(questionText) : explicitA;
        List<McqOption> listB = explicitB;
        if (listB.isEmpty()) {
            listB = parseListBFromDiagram(variant.path("question_diagram").path("diagram_params"));
        }
        if (listB.isEmpty()) {
            listB = parseListBPoolFromOptions(variant);
        }
        if (explicitB.isEmpty()) {
            listB = shuffleListB(listB, seed(variant));
        }

        String intro = parseIntro(questionText, listA);
        if (intro.isBlank()) {
            intro = defaultIntro(questionText);
        }
        return new ParsedMatching(intro, listA, listB);
    }

    private static String parseIntro(String questionText, List<McqOption> listA) {
        if (questionText == null || questionText.isBlank()) {
            return "";
        }
        Matcher matcher = LIST_A_ITEM.matcher(questionText);
        if (matcher.find()) {
            return questionText.substring(0, matcher.start()).trim().replaceAll("[:\\s]+$", "");
        }
        if (!listA.isEmpty()) {
            return questionText.trim();
        }
        return "";
    }

    private static String defaultIntro(String questionText) {
        if (questionText == null || questionText.isBlank()) {
            return "Match List-I with List-II";
        }
        String trimmed = questionText.trim();
        int idx = trimmed.toLowerCase(Locale.ROOT).indexOf(" a.");
        if (idx > 0) {
            return trimmed.substring(0, idx).trim().replaceAll("[:\\s]+$", "");
        }
        return "Match List-I with List-II";
    }

    private static List<McqOption> parseListA(String questionText) {
        if (questionText == null || questionText.isBlank()) {
            return List.of();
        }
        List<McqOption> out = new ArrayList<>();
        Matcher matcher = LIST_A_ITEM.matcher(questionText);
        while (matcher.find()) {
            String label = matcher.group(1);
            String body = matcher.group(2).trim().replaceAll("\\s+", " ");
            if (!body.isBlank()) {
                McqOption option = new McqOption();
                option.setId(label);
                option.setText(body);
                out.add(option);
            }
        }
        return out;
    }

    private static List<McqOption> parseListBFromDiagram(JsonNode params) {
        if (params == null || !params.isObject()) {
            return List.of();
        }
        List<McqOption> out = new ArrayList<>();
        int index = 1;
        Iterator<Map.Entry<String, JsonNode>> fields = params.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> entry = fields.next();
            String value = entry.getValue().isTextual() ? entry.getValue().asText("").trim() : entry.getValue().toString();
            if (!value.isBlank()) {
                McqOption option = new McqOption();
                option.setId(String.valueOf(index++));
                option.setText(value);
                out.add(option);
            }
        }
        return out;
    }

    private static List<McqOption> parseListBPoolFromOptions(JsonNode variant) {
        LinkedHashSet<String> unique = new LinkedHashSet<>();
        for (JsonNode opt : variant.path("options")) {
            collectMappedValues(text(opt, "text"), unique);
        }
        if (unique.isEmpty()) {
            String answerId = text(variant, "answer");
            for (JsonNode opt : variant.path("options")) {
                if (answerId.equals(text(opt, "id"))) {
                    collectMappedValues(text(opt, "text"), unique);
                    break;
                }
            }
        }
        List<McqOption> out = new ArrayList<>();
        int index = 1;
        for (String value : unique) {
            McqOption option = new McqOption();
            option.setId(String.valueOf(index++));
            option.setText(value);
            out.add(option);
        }
        return out;
    }

    private static void collectMappedValues(String answerText, LinkedHashSet<String> unique) {
        if (answerText == null || answerText.isBlank()) {
            return;
        }
        Matcher matcher = ANSWER_MAPPING.matcher(answerText);
        while (matcher.find()) {
            String body = matcher.group(2).trim().replaceAll("\\s+", " ");
            if (!body.isBlank()) {
                unique.add(body);
            }
        }
    }

    private static List<McqOption> shuffleListB(List<McqOption> items, String seed) {
        if (items.size() <= 1) {
            return items;
        }
        List<McqOption> copy = new ArrayList<>(items);
        Random rng = new Random(seed.hashCode());
        for (int i = copy.size() - 1; i > 0; i--) {
            int j = rng.nextInt(i + 1);
            Collections.swap(copy, i, j);
        }
        for (int i = 0; i < copy.size(); i++) {
            copy.get(i).setId(String.valueOf(i + 1));
        }
        return copy;
    }

    private static String seed(JsonNode variant) {
        String questionId = text(variant, "question_id");
        if (!questionId.isBlank()) {
            return questionId;
        }
        String parent = text(variant, "parent_question_id");
        int variantNo = variant.path("variant_no").asInt(0);
        if (!parent.isBlank() && variantNo > 0) {
            return parent + "_V" + variantNo;
        }
        return text(variant, "question_text");
    }

    private static List<McqOption> readOptionList(JsonNode arr) {
        if (arr == null || !arr.isArray()) {
            return List.of();
        }
        List<McqOption> out = new ArrayList<>();
        int fallbackId = 1;
        for (JsonNode node : arr) {
            String id = text(node, "id");
            if (id.isBlank() && node.has("label")) {
                id = text(node, "label");
            }
            if (id.isBlank()) {
                id = String.valueOf(fallbackId++);
            }
            String body = text(node, "text");
            if (body.isBlank()) {
                body = node.asText("").trim();
            }
            if (!body.isBlank()) {
                McqOption option = new McqOption();
                option.setId(id);
                option.setText(body);
                out.add(option);
            }
        }
        return out;
    }

    private static String text(JsonNode node, String field) {
        if (node == null || node.isMissingNode()) {
            return "";
        }
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) {
            return "";
        }
        return value.asText("").trim();
    }
}
