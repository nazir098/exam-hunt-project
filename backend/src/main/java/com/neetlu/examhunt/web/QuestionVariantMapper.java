package com.neetlu.examhunt.web;

import com.neetlu.examhunt.model.AssetPlacement;
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

    static List<QuestionController.McqOptionView> mapMatchListA(Question q) {
        return mapOptionList(q.getMatchListA());
    }

    static List<QuestionController.McqOptionView> mapMatchListB(Question q) {
        return mapOptionList(q.getMatchListB());
    }

    static List<PracticeController.McqOptionView> mapMatchListAForPractice(Question q) {
        return mapOptionListForPractice(q.getMatchListA());
    }

    static List<PracticeController.McqOptionView> mapMatchListBForPractice(Question q) {
        return mapOptionListForPractice(q.getMatchListB());
    }

    private static List<QuestionController.McqOptionView> mapOptionList(List<McqOption> items) {
        if (items == null || items.isEmpty()) {
            return List.of();
        }
        return items.stream().map(QuestionVariantMapper::toView).toList();
    }

    private static List<PracticeController.McqOptionView> mapOptionListForPractice(List<McqOption> items) {
        if (items == null || items.isEmpty()) {
            return List.of();
        }
        return items.stream()
                .map(o -> new PracticeController.McqOptionView(o.getId(), o.getText()))
                .toList();
    }

    private static QuestionController.McqOptionView toView(McqOption o) {
        return new QuestionController.McqOptionView(o.getId(), o.getText());
    }

    static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    static List<QuestionController.AssetPlacementView> mapAssetPlacements(Question q) {
        if (q.getAssetPlacements() == null || q.getAssetPlacements().isEmpty()) {
            return List.of();
        }
        return q.getAssetPlacements().stream().map(QuestionVariantMapper::toAssetView).toList();
    }

    static List<PracticeController.AssetPlacementView> mapAssetPlacementsForPractice(Question q) {
        if (q.getAssetPlacements() == null || q.getAssetPlacements().isEmpty()) {
            return List.of();
        }
        return q.getAssetPlacements().stream()
                .map(
                        p ->
                                new PracticeController.AssetPlacementView(
                                        p.getIndex(), p.getMarker(), p.getPath(), p.getUrl()))
                .toList();
    }

    private static QuestionController.AssetPlacementView toAssetView(AssetPlacement p) {
        return new QuestionController.AssetPlacementView(
                p.getIndex(), p.getMarker(), p.getPath(), p.getUrl());
    }
}
