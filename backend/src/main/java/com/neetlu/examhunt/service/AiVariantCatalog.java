package com.neetlu.examhunt.service;

import com.neetlu.examhunt.model.Question;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Canonical AI variant selection — one V1–V5 per parent PYQ. */
public final class AiVariantCatalog {

    private AiVariantCatalog() {}

    public static List<Question> forParentInPack(List<Question> variants, String packId) {
        if (packId == null || packId.isBlank()) {
            return dedupeByVariantNo(variants);
        }
        List<Question> scoped = new ArrayList<>();
        for (Question v : variants) {
            if (packId.equals(v.getPackId())) {
                scoped.add(v);
            }
        }
        return dedupeByVariantNo(scoped);
    }

    public static List<Question> dedupeByVariantNo(List<Question> variants) {
        Map<Integer, Question> best = new LinkedHashMap<>();
        for (Question v : variants) {
            int no = v.getVariantNo();
            if (no <= 0) {
                continue;
            }
            best.merge(no, v, AiVariantCatalog::preferCanonical);
        }
        return best.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(Map.Entry::getValue)
                .toList();
    }

    public static Question preferCanonical(Question a, Question b) {
        int scoreA = canonicalScore(a);
        int scoreB = canonicalScore(b);
        if (scoreB != scoreA) {
            return scoreB > scoreA ? b : a;
        }
        String idA = a.getQuestionId() != null ? a.getQuestionId() : "";
        String idB = b.getQuestionId() != null ? b.getQuestionId() : "";
        return idB.compareTo(idA) < 0 ? b : a;
    }

    private static int canonicalScore(Question q) {
        int score = 0;
        String id = q.getQuestionId();
        if (id != null && id.startsWith("AI_")) {
            score += 8;
        }
        if (q.getOptions() != null && !q.getOptions().isEmpty()) {
            score += 4;
        }
        if (q.getQuestionTextPreview() != null && !q.getQuestionTextPreview().isBlank()) {
            score += 2;
        }
        if (q.isHasSolution()) {
            score += 1;
        }
        return score;
    }

    public static Comparator<Question> byVariantNo() {
        return Comparator.comparingInt(Question::getVariantNo);
    }
}
