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
import java.util.Optional;
import java.util.Random;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Parses AI variant JSON for {@code variant_type: matching} into structured list columns. */
final class MatchingVariantParser {

    private static final Pattern LIST_A_ITEM =
            Pattern.compile("\\b([A-D])\\.\\s*(.+?)(?=\\s+[A-D]\\.\\s|$)", Pattern.DOTALL);
    private static final Pattern ANSWER_MAPPING =
            Pattern.compile("\\b([A-D])\\s*[-–:]\\s*(.+?)(?=\\s*,\\s*[A-D]\\s*[-–:]|$)", Pattern.DOTALL);

    private static final Pattern MATCHING_TABLE_ROW =
            Pattern.compile(
                    "^\\|\\s*([A-D])\\.?\\s*\\|\\s*([^|]+?)\\s*\\|\\s*(?:\\(?([IVX]+)\\)?\\.?)\\s*\\|\\s*([^|]+?)\\s*\\|",
                    Pattern.CASE_INSENSITIVE);

    private MatchingVariantParser() {}

    record ParsedMatching(String intro, List<McqOption> listA, List<McqOption> listB) {}

    static boolean listsLookCorrupt(List<McqOption> listA, List<McqOption> listB) {
        if (listA == null || listA.size() < 3) {
            return true;
        }
        for (McqOption row : listA) {
            String body = Optional.ofNullable(row.getText()).orElse("").trim();
            if (body.isBlank()) {
                return true;
            }
            if (body.matches("(?s).*\\s+[IVX]{1,4}\\.\\s+.*")) {
                return true;
            }
            if (body.toLowerCase(Locale.ROOT).contains("choose the correct")) {
                return true;
            }
        }
        if (listB == null || listB.isEmpty()) {
            return false;
        }
        for (McqOption row : listB) {
            String body = Optional.ofNullable(row.getText()).orElse("").trim();
            if (body.matches("^[IVX]+$")) {
                return true;
            }
        }
        return false;
    }

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
        String parseText = resolveParseText(variant);
        ParsedMatching table = parseMatchingTable(parseText);
        if (table != null) {
            return table;
        }

        List<McqOption> explicitA = readOptionList(variant.path("list_a"));
        if (explicitA.isEmpty()) {
            explicitA = readOptionList(variant.path("match_list_a"));
        }
        List<McqOption> explicitB = readOptionList(variant.path("list_b"));
        if (explicitB.isEmpty()) {
            explicitB = readOptionList(variant.path("match_list_b"));
        }

        String questionText = parseText;

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

    private static String resolveParseText(JsonNode variant) {
        String stem = text(variant, "question_stem");
        if (!stem.isBlank() && stem.contains("|")) {
            return stem;
        }
        String mineru = text(variant, "question_text_mineru");
        if (!mineru.isBlank() && mineru.contains("|")) {
            return mineru;
        }
        String preview = text(variant, "question_text_preview");
        if (!preview.isBlank()) {
            return preview;
        }
        return text(variant, "question_text");
    }

    private static ParsedMatching parseMatchingTable(String text) {
        if (text == null || text.isBlank() || !text.contains("|")) {
            return null;
        }
        List<McqOption> listA = new ArrayList<>();
        List<McqOption> listB = new ArrayList<>();
        for (String line : text.split("\\R")) {
            String trimmed = line.trim();
            if (!trimmed.startsWith("|")) {
                continue;
            }
            Matcher matcher = MATCHING_TABLE_ROW.matcher(trimmed);
            if (!matcher.find()) {
                continue;
            }
            String idA = matcher.group(1).toUpperCase(Locale.ROOT);
            String bodyA = matcher.group(2).trim().replaceAll("\\s+", " ");
            String idB = matcher.group(3).toUpperCase(Locale.ROOT);
            String bodyB = matcher.group(4).trim().replaceAll("\\s+", " ");
            if (!bodyA.isBlank()) {
                McqOption rowA = new McqOption();
                rowA.setId(idA);
                rowA.setText(bodyA);
                listA.add(rowA);
            }
            if (!bodyB.isBlank()) {
                McqOption rowB = new McqOption();
                rowB.setId(idB);
                rowB.setText(bodyB);
                listB.add(rowB);
            }
        }
        if (listA.size() < 3 || listB.size() < 3) {
            return null;
        }
        listB.sort(
                (a, b) ->
                        Integer.compare(
                                romanOrder(a.getId()), romanOrder(b.getId())));
        int tableStart = text.indexOf('|');
        String intro =
                tableStart > 0
                        ? text.substring(0, tableStart).trim().replaceAll("[:\\s.]+$", "")
                        : "Match List-I with List-II";
        if (intro.isBlank()) {
            intro = "Match List-I with List-II";
        }
        return new ParsedMatching(intro, listA, listB);
    }

    private static int romanOrder(String id) {
        if (id == null) {
            return 99;
        }
        return switch (id.toUpperCase(Locale.ROOT)) {
            case "I" -> 1;
            case "II" -> 2;
            case "III" -> 3;
            case "IV" -> 4;
            case "V" -> 5;
            case "VI" -> 6;
            default -> 99;
        };
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
