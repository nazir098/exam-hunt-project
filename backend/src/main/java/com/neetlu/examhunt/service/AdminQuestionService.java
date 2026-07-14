package com.neetlu.examhunt.service;

import com.neetlu.examhunt.model.FormulaCard;
import com.neetlu.examhunt.model.McqOption;
import com.neetlu.examhunt.model.Question;
import com.neetlu.examhunt.repository.QuestionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class AdminQuestionService {

    private final QuestionRepository questions;
    private final ManifestImportService manifestImportService;

    public AdminQuestionService(QuestionRepository questions, ManifestImportService manifestImportService) {
        this.questions = questions;
        this.manifestImportService = manifestImportService;
    }

    public Page<QuestionSearchRow> search(String packId, String query, int page, int size) {
        if (query == null || query.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Query q is required");
        }
        PageRequest pageable = PageRequest.of(page, Math.min(size, 50), Sort.by("questionNo"));
        String pattern = Pattern.quote(query.trim());
        Page<Question> result;
        if (packId != null && !packId.isBlank()) {
            result = questions.searchInPack(packId, pattern, pageable);
        } else {
            result = questions.searchByExam("NEET", pattern, pageable);
        }
        return result.map(QuestionSearchRow::from);
    }

    public AdminQuestionDetail get(String questionId) {
        Question q = require(questionId);
        q = manifestImportService.enrichFromDisk(q);
        return AdminQuestionDetail.from(q);
    }

    public AdminQuestionDetail updateContent(String questionId, UpdateContentRequest body) {
        Question q = require(questionId);
        if (body.questionTextPreview() != null) {
            q.setQuestionTextPreview(body.questionTextPreview());
            AdminQuestionPreserve.lock(q, AdminQuestionPreserve.QUESTION_TEXT);
        }
        if (body.solutionTextPreview() != null) {
            q.setSolutionTextPreview(body.solutionTextPreview());
            AdminQuestionPreserve.lock(q, AdminQuestionPreserve.SOLUTION_TEXT);
        }
        if (body.answer() != null) {
            validateAnswer(body.answer());
            q.setAnswer(body.answer().strip());
            AdminQuestionPreserve.lock(q, AdminQuestionPreserve.ANSWER);
        }
        if (body.options() != null) {
            q.setOptions(mapOptions(body.options()));
            AdminQuestionPreserve.lock(q, AdminQuestionPreserve.OPTIONS);
        }
        if (body.questionFormat() != null) {
            q.setQuestionFormat(body.questionFormat().strip());
            AdminQuestionPreserve.lock(q, AdminQuestionPreserve.QUESTION_FORMAT);
        }
        if (body.assertion() != null) {
            q.setAssertion(body.assertion());
            AdminQuestionPreserve.lock(q, AdminQuestionPreserve.ASSERTION);
        }
        if (body.reason() != null) {
            q.setReason(body.reason());
            AdminQuestionPreserve.lock(q, AdminQuestionPreserve.REASON);
        }
        if (body.statements() != null) {
            q.setStatements(mapOptions(body.statements()));
            AdminQuestionPreserve.lock(q, AdminQuestionPreserve.STATEMENTS);
        }
        if (body.questionDiagramSvg() != null) {
            q.setQuestionDiagramSvg(body.questionDiagramSvg());
            AdminQuestionPreserve.lock(q, AdminQuestionPreserve.QUESTION_DIAGRAM_SVG);
        }
        if (body.solutionDiagramSvg() != null) {
            q.setSolutionDiagramSvg(body.solutionDiagramSvg());
            AdminQuestionPreserve.lock(q, AdminQuestionPreserve.SOLUTION_DIAGRAM_SVG);
        }
        questions.save(q);
        return AdminQuestionDetail.from(q);
    }

    public AdminQuestionDetail resetContentFromMetadata(String questionId) {
        if (!manifestImportService.isLocalContentWorkspace()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Content sync requires EXTRACTOR_ROOT on localhost — production serves Mongo only");
        }
        Question q = require(questionId);
        AdminQuestionPreserve.unlockContentFields(q);
        questions.save(q);
        // Force full metadata → Mongo apply. Plain enrichFromDisk skips when Mongo already
        // looks structured, which left the admin "student view out of date" banner stuck.
        q = manifestImportService.forceRefreshContentFromDisk(q);
        return AdminQuestionDetail.from(q);
    }

    public AdminQuestionDetail updateEnrichment(String questionId, UpdateEnrichmentRequest body) {
        Question q = require(questionId);
        if (body.clearFeatures() != null) {
            for (String feature : body.clearFeatures()) {
                clearFeature(q, feature);
            }
        }
        if (body.hints() != null) {
            q.setHints(sanitizeList(body.hints(), 3));
            AdminQuestionPreserve.lock(q, AdminQuestionPreserve.HINTS);
        }
        if (body.revisionNotes() != null) {
            q.setRevisionNotes(body.revisionNotes().strip());
            AdminQuestionPreserve.lock(q, AdminQuestionPreserve.REVISION_NOTES);
        }
        if (body.conceptExplanation() != null) {
            q.setConceptExplanation(body.conceptExplanation());
            AdminQuestionPreserve.lock(q, AdminQuestionPreserve.CONCEPT_EXPLANATION);
        }
        if (body.commonMistakes() != null) {
            q.setCommonMistakes(sanitizeList(body.commonMistakes(), 20));
            AdminQuestionPreserve.lock(q, AdminQuestionPreserve.COMMON_MISTAKES);
        }
        if (body.practicePattern() != null) {
            q.setPracticePattern(body.practicePattern());
            AdminQuestionPreserve.lock(q, AdminQuestionPreserve.PRACTICE_PATTERN);
        }
        if (body.whyWrongByAnswer() != null) {
            Map<String, String> map = new LinkedHashMap<>();
            body.whyWrongByAnswer().forEach((k, v) -> {
                if (k != null && v != null && !v.isBlank()) {
                    map.put(k.strip(), v.strip());
                }
            });
            q.setWhyWrongByAnswer(map);
            AdminQuestionPreserve.lock(q, AdminQuestionPreserve.WHY_WRONG);
        }
        if (body.formulaCards() != null) {
            List<FormulaCard> cards = new ArrayList<>();
            for (FormulaCardInput input : body.formulaCards()) {
                if (input == null || input.name() == null || input.name().isBlank()) {
                    continue;
                }
                FormulaCard card = new FormulaCard();
                card.setName(input.name().strip());
                card.setFormula(input.formula() != null ? input.formula().strip() : "");
                card.setDescription(input.description() != null ? input.description().strip() : "");
                cards.add(card);
            }
            q.setFormulaCards(cards);
            AdminQuestionPreserve.lock(q, AdminQuestionPreserve.FORMULA_CARDS);
        }
        questions.save(q);
        return AdminQuestionDetail.from(q);
    }

    private static void clearFeature(Question q, String raw) {
        String feature = raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT).replace('-', '_');
        switch (feature) {
            case "hint" -> q.setHints(null);
            case "formula" -> q.setFormulaCards(null);
            case "explain_basics" -> {
                q.setConceptExplanation(null);
                q.setHints(null);
            }
            case "pitfalls" -> {
                q.setCommonMistakes(null);
                q.setPracticePattern(null);
            }
            case "revision_notes" -> q.setRevisionNotes(null);
            case "why_wrong" -> q.setWhyWrongByAnswer(null);
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown feature to clear: " + raw);
        }
        AdminQuestionPreserve.unlockForFeature(q, feature);
    }

    private static List<String> sanitizeList(List<String> items, int max) {
        if (items == null) {
            return List.of();
        }
        List<String> out = new ArrayList<>();
        for (String item : items) {
            if (item == null) {
                continue;
            }
            String text = item.strip();
            if (!text.isBlank()) {
                out.add(text);
            }
            if (out.size() >= max) {
                break;
            }
        }
        return out;
    }

    private static List<McqOption> mapOptions(List<OptionInput> inputs) {
        List<McqOption> out = new ArrayList<>();
        for (OptionInput input : inputs) {
            if (input == null || input.id() == null || input.id().isBlank()) {
                continue;
            }
            McqOption opt = new McqOption();
            opt.setId(input.id().strip());
            opt.setText(input.text() != null ? input.text() : "");
            out.add(opt);
        }
        return out;
    }

    private static void validateAnswer(String answer) {
        String key = answer.strip();
        if (!key.matches("[1-4]")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "answer must be 1, 2, 3, or 4");
        }
    }

    private Question require(String questionId) {
        return questions
                .findByQuestionId(questionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));
    }

    public record QuestionSearchRow(
            String questionId,
            String packId,
            int questionNo,
            String exam,
            int year,
            String subject,
            String chapter,
            String questionTextPreview,
            String sourceType,
            int variantNo) {

        static QuestionSearchRow from(Question q) {
            return new QuestionSearchRow(
                    q.getQuestionId(),
                    q.getPackId(),
                    q.getQuestionNo(),
                    q.getExam(),
                    q.getYear(),
                    q.getSubject(),
                    q.getChapter(),
                    q.getQuestionTextPreview(),
                    q.getSourceType() != null ? q.getSourceType() : "pyq",
                    q.getVariantNo());
        }
    }

    public record OptionInput(String id, String text) {}

    public record OptionView(String id, String text) {}

    public record FormulaCardInput(String name, String formula, String description) {}

    public record UpdateContentRequest(
            String questionTextPreview,
            String solutionTextPreview,
            String answer,
            List<OptionInput> options,
            String questionFormat,
            String assertion,
            String reason,
            List<OptionInput> statements,
            String questionDiagramSvg,
            String solutionDiagramSvg) {}

    public record UpdateEnrichmentRequest(
            List<String> hints,
            String revisionNotes,
            String conceptExplanation,
            List<String> commonMistakes,
            String practicePattern,
            Map<String, String> whyWrongByAnswer,
            List<FormulaCardInput> formulaCards,
            List<String> clearFeatures) {}

    public record FormulaCardView(String name, String formula, String description) {}

    public record AdminQuestionDetail(
            String questionId,
            String packId,
            int questionNo,
            String exam,
            int year,
            String answer,
            String subject,
            String chapter,
            String topic,
            String subtopic,
            int difficulty,
            List<String> concepts,
            boolean hasDiagram,
            boolean hasEquation,
            boolean formulaRelevant,
            boolean hasSolution,
            boolean answerOnly,
            String questionImageUrl,
            String solutionImageUrl,
            String questionTextPreview,
            String solutionTextPreview,
            List<OptionView> options,
            String sourceType,
            String parentQuestionId,
            int variantNo,
            String variantType,
            String questionFormat,
            String assertion,
            String reason,
            List<OptionView> statements,
            String questionDiagramSvg,
            String solutionDiagramSvg,
            List<String> hints,
            List<FormulaCardView> formulaCards,
            String conceptExplanation,
            List<String> commonMistakes,
            String practicePattern,
            String revisionNotes,
            Map<String, String> whyWrongByAnswer,
            Set<String> adminLockedFields,
            String renderMode,
            List<AssetPlacementView> assetPlacements) {

        public record AssetPlacementView(int index, String marker, String path, String url) {}

        static AdminQuestionDetail from(Question q) {
            return new AdminQuestionDetail(
                    q.getQuestionId(),
                    q.getPackId(),
                    q.getQuestionNo(),
                    q.getExam(),
                    q.getYear(),
                    q.getAnswer(),
                    q.getSubject(),
                    q.getChapter(),
                    q.getTopic(),
                    q.getSubtopic(),
                    q.getDifficulty(),
                    q.getConcepts(),
                    q.isHasDiagram(),
                    q.isHasEquation(),
                    FormulaEligibility.questionNeedsFormula(q),
                    hasRenderableSolution(q),
                    q.isAnswerOnly(),
                    q.getQuestionImageUrl(),
                    hasRenderableSolution(q) ? nullToEmpty(q.getSolutionImageUrl()) : "",
                    q.getQuestionTextPreview(),
                    q.getSolutionTextPreview(),
                    mapOptions(q),
                    q.getSourceType() != null ? q.getSourceType() : "pyq",
                    q.getParentQuestionId(),
                    q.getVariantNo(),
                    q.getVariantType(),
                    nullToEmpty(q.getQuestionFormat()),
                    nullToEmpty(q.getAssertion()),
                    nullToEmpty(q.getReason()),
                    mapStatements(q),
                    nullToEmpty(q.getQuestionDiagramSvg()),
                    nullToEmpty(q.getSolutionDiagramSvg()),
                    q.getHints() != null ? List.copyOf(q.getHints()) : List.of(),
                    mapFormulaCards(q),
                    nullToEmpty(q.getConceptExplanation()),
                    q.getCommonMistakes() != null ? List.copyOf(q.getCommonMistakes()) : List.of(),
                    nullToEmpty(q.getPracticePattern()),
                    nullToEmpty(q.getRevisionNotes()),
                    q.getWhyWrongByAnswer() != null ? Map.copyOf(q.getWhyWrongByAnswer()) : Map.of(),
                    q.getAdminLockedFields() != null ? Set.copyOf(q.getAdminLockedFields()) : Set.of(),
                    QuestionRenderMode.normalize(q.getRenderMode()),
                    mapAssetPlacements(q));
        }

        private static List<AssetPlacementView> mapAssetPlacements(Question q) {
            if (q.getAssetPlacements() == null || q.getAssetPlacements().isEmpty()) {
                return List.of();
            }
            return q.getAssetPlacements().stream()
                    .map(
                            p ->
                                    new AssetPlacementView(
                                            p.getIndex(), p.getMarker(), p.getPath(), p.getUrl()))
                    .toList();
        }

        private static List<OptionView> mapOptions(Question q) {
            if (q.getOptions() == null || q.getOptions().isEmpty()) {
                return List.of();
            }
            return q.getOptions().stream().map(o -> new OptionView(o.getId(), o.getText())).toList();
        }

        private static List<OptionView> mapStatements(Question q) {
            if (q.getStatements() == null || q.getStatements().isEmpty()) {
                return List.of();
            }
            return q.getStatements().stream().map(o -> new OptionView(o.getId(), o.getText())).toList();
        }

        private static List<FormulaCardView> mapFormulaCards(Question q) {
            if (q.getFormulaCards() == null || q.getFormulaCards().isEmpty()) {
                return List.of();
            }
            return q.getFormulaCards().stream()
                    .map(c -> new FormulaCardView(
                            nullToEmpty(c.getName()),
                            nullToEmpty(c.getFormula()),
                            nullToEmpty(c.getDescription())))
                    .toList();
        }

        private static String nullToEmpty(String value) {
            return value == null ? "" : value;
        }

        private static boolean hasRenderableSolution(Question q) {
            if (q.isHasSolution()) {
                return true;
            }
            if (!nullToEmpty(q.getSolutionImageUrl()).isBlank()) {
                return true;
            }
            return !nullToEmpty(q.getSolutionTextPreview()).isBlank();
        }
    }
}
