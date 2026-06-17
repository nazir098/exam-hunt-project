package com.neetlu.examhunt.service;

import com.neetlu.examhunt.model.FormulaCard;
import com.neetlu.examhunt.model.McqOption;
import com.neetlu.examhunt.model.Question;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** Admin-edited question fields take priority over import, enrich, and LLM cache writes. */
final class AdminQuestionPreserve {

    static final String QUESTION_TEXT = "questionTextPreview";
    static final String SOLUTION_TEXT = "solutionTextPreview";
    static final String ANSWER = "answer";
    static final String OPTIONS = "options";
    static final String QUESTION_FORMAT = "questionFormat";
    static final String ASSERTION = "assertion";
    static final String REASON = "reason";
    static final String STATEMENTS = "statements";
    static final String MATCH_LIST_A = "matchListA";
    static final String MATCH_LIST_B = "matchListB";
    static final String QUESTION_DIAGRAM_SVG = "questionDiagramSvg";
    static final String SOLUTION_DIAGRAM_SVG = "solutionDiagramSvg";
    static final String HINTS = "hints";
    static final String FORMULA_CARDS = "formulaCards";
    static final String CONCEPT_EXPLANATION = "conceptExplanation";
    static final String COMMON_MISTAKES = "commonMistakes";
    static final String PRACTICE_PATTERN = "practicePattern";
    static final String REVISION_NOTES = "revisionNotes";
    static final String WHY_WRONG = "whyWrongByAnswer";

    private AdminQuestionPreserve() {}

    static Set<String> lockedFields(Question q) {
        if (q == null || q.getAdminLockedFields() == null || q.getAdminLockedFields().isEmpty()) {
            return Set.of();
        }
        return Set.copyOf(q.getAdminLockedFields());
    }

    static boolean isLocked(Question q, String field) {
        return q != null && q.getAdminLockedFields() != null && q.getAdminLockedFields().contains(field);
    }

    static void lock(Question q, String field) {
        if (q == null || field == null || field.isBlank()) {
            return;
        }
        Set<String> locks = q.getAdminLockedFields();
        if (locks == null) {
            locks = new LinkedHashSet<>();
            q.setAdminLockedFields(locks);
        }
        locks.add(field);
    }

    static void unlock(Question q, String field) {
        if (q == null || q.getAdminLockedFields() == null || field == null) {
            return;
        }
        q.getAdminLockedFields().remove(field);
        if (q.getAdminLockedFields().isEmpty()) {
            q.setAdminLockedFields(null);
        }
    }

    static void unlockForFeature(Question q, String feature) {
        String normalized = feature == null ? "" : feature.trim().toLowerCase(Locale.ROOT).replace('-', '_');
        switch (normalized) {
            case "hint" -> unlock(q, HINTS);
            case "formula" -> unlock(q, FORMULA_CARDS);
            case "explain_basics" -> {
                unlock(q, CONCEPT_EXPLANATION);
                unlock(q, HINTS);
                unlock(q, COMMON_MISTAKES);
            }
            case "pitfalls" -> {
                unlock(q, COMMON_MISTAKES);
                unlock(q, PRACTICE_PATTERN);
            }
            case "revision_notes" -> unlock(q, REVISION_NOTES);
            case "why_wrong" -> unlock(q, WHY_WRONG);
            default -> { /* unknown */ }
        }
    }

    /** Copy admin-locked values from source onto target (import / enrich / upsert merge). */
    static void applyLockedFromSource(Question source, Question target) {
        if (source == null || target == null) {
            return;
        }
        Set<String> locked = lockedFields(source);
        if (locked.isEmpty()) {
            return;
        }
        Set<String> targetLocks = target.getAdminLockedFields();
        if (targetLocks == null) {
            targetLocks = new LinkedHashSet<>();
            target.setAdminLockedFields(targetLocks);
        }
        targetLocks.addAll(locked);
        for (String field : locked) {
            copyField(source, target, field);
        }
    }

    /** Snapshot locked field values before pack re-import wipes the collection. */
    static Question copyPreserveState(Question source) {
        Set<String> locked = lockedFields(source);
        if (locked.isEmpty()) {
            return null;
        }
        Question copy = new Question();
        copy.setQuestionId(source.getQuestionId());
        copy.setAdminLockedFields(new LinkedHashSet<>(locked));
        applyLockedFromSource(source, copy);
        return copy;
    }

    static void restorePreserved(Question preserved, Question imported) {
        applyLockedFromSource(preserved, imported);
    }

    private static void copyField(Question source, Question target, String field) {
        switch (field) {
            case QUESTION_TEXT -> target.setQuestionTextPreview(source.getQuestionTextPreview());
            case SOLUTION_TEXT -> target.setSolutionTextPreview(source.getSolutionTextPreview());
            case ANSWER -> target.setAnswer(source.getAnswer());
            case OPTIONS -> target.setOptions(copyOptions(source.getOptions()));
            case QUESTION_FORMAT -> target.setQuestionFormat(source.getQuestionFormat());
            case ASSERTION -> target.setAssertion(source.getAssertion());
            case REASON -> target.setReason(source.getReason());
            case STATEMENTS -> target.setStatements(copyOptions(source.getStatements()));
            case MATCH_LIST_A -> target.setMatchListA(copyOptions(source.getMatchListA()));
            case MATCH_LIST_B -> target.setMatchListB(copyOptions(source.getMatchListB()));
            case QUESTION_DIAGRAM_SVG -> target.setQuestionDiagramSvg(source.getQuestionDiagramSvg());
            case SOLUTION_DIAGRAM_SVG -> target.setSolutionDiagramSvg(source.getSolutionDiagramSvg());
            case HINTS -> target.setHints(copyStrings(source.getHints()));
            case FORMULA_CARDS -> target.setFormulaCards(copyFormulaCards(source.getFormulaCards()));
            case CONCEPT_EXPLANATION -> target.setConceptExplanation(source.getConceptExplanation());
            case COMMON_MISTAKES -> target.setCommonMistakes(copyStrings(source.getCommonMistakes()));
            case PRACTICE_PATTERN -> target.setPracticePattern(source.getPracticePattern());
            case REVISION_NOTES -> target.setRevisionNotes(source.getRevisionNotes());
            case WHY_WRONG -> target.setWhyWrongByAnswer(copyWhyWrong(source.getWhyWrongByAnswer()));
            default -> { /* ignore unknown legacy keys */ }
        }
    }

    private static List<String> copyStrings(List<String> items) {
        return items == null ? null : new ArrayList<>(items);
    }

    private static List<McqOption> copyOptions(List<McqOption> items) {
        if (items == null) {
            return null;
        }
        List<McqOption> out = new ArrayList<>();
        for (McqOption o : items) {
            McqOption copy = new McqOption();
            copy.setId(o.getId());
            copy.setText(o.getText());
            out.add(copy);
        }
        return out;
    }

    private static List<FormulaCard> copyFormulaCards(List<FormulaCard> items) {
        if (items == null) {
            return null;
        }
        List<FormulaCard> out = new ArrayList<>();
        for (FormulaCard c : items) {
            FormulaCard copy = new FormulaCard();
            copy.setName(c.getName());
            copy.setFormula(c.getFormula());
            copy.setDescription(c.getDescription());
            out.add(copy);
        }
        return out;
    }

    private static Map<String, String> copyWhyWrong(Map<String, String> map) {
        return map == null ? null : new LinkedHashMap<>(map);
    }
}
