package com.neetlu.examhunt.web;

import com.neetlu.examhunt.model.McqOption;
import com.neetlu.examhunt.model.Question;

import java.util.List;

/** Shared API mapping for AI variant text fields. */
final class QuestionVariantMapper {

    private QuestionVariantMapper() {}

    static List<QuestionController.McqOptionView> mapStatements(Question q) {
        if (q.getStatements() == null || q.getStatements().isEmpty()) {
            return List.of();
        }
        return q.getStatements().stream().map(QuestionVariantMapper::toView).toList();
    }

    static List<PracticeController.McqOptionView> mapStatementsForPractice(Question q) {
        if (q.getStatements() == null || q.getStatements().isEmpty()) {
            return List.of();
        }
        return q.getStatements().stream()
                .map(o -> new PracticeController.McqOptionView(o.getId(), o.getText()))
                .toList();
    }

    private static QuestionController.McqOptionView toView(McqOption o) {
        return new QuestionController.McqOptionView(o.getId(), o.getText());
    }

    static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
