package com.neetlu.examhunt.web;

import com.neetlu.examhunt.model.Question;
import com.neetlu.examhunt.repository.QuestionRepository;
import com.neetlu.examhunt.service.FormulaEligibility;
import com.neetlu.examhunt.service.AiVariantCatalog;
import com.neetlu.examhunt.service.ManifestImportService;
import com.neetlu.examhunt.service.QuestionBrowseService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/questions")
public class QuestionController {

    private final QuestionRepository questionRepository;
    private final QuestionBrowseService questionBrowseService;
    private final ManifestImportService manifestImportService;

    public QuestionController(
            QuestionRepository questionRepository,
            QuestionBrowseService questionBrowseService,
            ManifestImportService manifestImportService
    ) {
        this.questionRepository = questionRepository;
        this.questionBrowseService = questionBrowseService;
        this.manifestImportService = manifestImportService;
    }

    @GetMapping
    public Page<QuestionPublic> list(
            @RequestParam String packId,
            @RequestParam(required = false) String subject,
            @RequestParam(required = false) String chapter,
            @RequestParam(required = false) String topic,
            @RequestParam(required = false) String difficulty,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size
    ) {
        PageRequest pageable = PageRequest.of(page, Math.min(size, 100), Sort.by("questionNo"));
        Page<Question> result = questionBrowseService.browse(
                packId, subject, chapter, topic, difficulty, q, pageable);
        return result.map(QuestionPublic::from);
    }

    @GetMapping("/search")
    public Page<QuestionPublic> search(
            @RequestParam String q,
            @RequestParam(defaultValue = "NEET") String exam,
            @RequestParam(required = false) String packId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size
    ) {
        if (q == null || q.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Query q is required");
        }
        PageRequest pageable = PageRequest.of(page, Math.min(size, 100), Sort.by("year").descending().and(Sort.by("questionNo")));
        Page<Question> result;
        if (packId != null && !packId.isBlank()) {
            result = questionRepository.searchInPack(packId, regexPattern(q), pageable);
        } else {
            result = questionRepository.searchByExam(exam, regexPattern(q), pageable);
        }
        return result.map(QuestionPublic::from);
    }

    private static String regexPattern(String raw) {
        return Pattern.quote(raw.trim());
    }

    @GetMapping("/{questionId}")
    public QuestionDetail get(@PathVariable String questionId) {
        Question q = questionRepository.findByQuestionId(questionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));
        q = manifestImportService.enrichVariantFromDisk(q);
        return QuestionDetail.from(q);
    }

    /** Original PYQ plus up to five QC-accepted AI variants for the same paper question. */
    @GetMapping("/{questionId}/family")
    public QuestionFamily family(@PathVariable String questionId) {
        Question active = questionRepository.findByQuestionId(questionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));
        String parentId = active.getParentQuestionId() != null && !active.getParentQuestionId().isBlank()
                ? active.getParentQuestionId()
                : active.getQuestionId();
        Question parent = questionRepository.findByQuestionId(parentId).orElse(active);
        List<Question> variants =
                AiVariantCatalog.forParentInPack(
                        questionRepository.findByParentQuestionIdOrderByVariantNoAsc(parentId),
                        parent.getPackId());
        List<VariantRef> variantRefs = new ArrayList<>();
        for (Question v : variants) {
            variantRefs.add(new VariantRef(
                    v.getQuestionId(),
                    v.getVariantNo(),
                    v.getVariantType(),
                    v.getDifficulty(),
                    v.isHasSolution(),
                    v.getQuestionTextPreview()));
        }
        return new QuestionFamily(
                parentId,
                parent.getQuestionNo(),
                active.getQuestionId(),
                QuestionPublic.from(parent),
                variantRefs);
    }

    /** List view — answer hidden until client reveals it. */
    public record QuestionPublic(
            String questionId,
            String packId,
            int questionNo,
            String exam,
            int year,
            String subject,
            String chapter,
            String topic,
            int difficulty,
            boolean hasSolution,
            boolean answerOnly,
            String questionImageUrl,
            String solutionImageUrl,
            String questionTextPreview,
            java.util.List<McqOptionView> options,
            String sourceType,
            String parentQuestionId,
            int variantNo,
            String variantType
    ) {
        static QuestionPublic from(Question q) {
            return new QuestionPublic(
                    q.getQuestionId(),
                    q.getPackId(),
                    q.getQuestionNo(),
                    q.getExam(),
                    q.getYear(),
                    q.getSubject(),
                    q.getChapter(),
                    q.getTopic(),
                    q.getDifficulty(),
                    hasRenderableSolution(q),
                    q.isAnswerOnly(),
                    q.getQuestionImageUrl(),
                    hasRenderableSolution(q) ? nullToEmpty(q.getSolutionImageUrl()) : "",
                    q.getQuestionTextPreview(),
                    mapOptions(q),
                    q.getSourceType() != null ? q.getSourceType() : "pyq",
                    q.getParentQuestionId(),
                    q.getVariantNo(),
                    q.getVariantType()
            );
        }
    }

    public record McqOptionView(String id, String text) {}

    private static java.util.List<McqOptionView> mapOptions(Question q) {
        if (q.getOptions() == null || q.getOptions().isEmpty()) {
            return java.util.List.of();
        }
        return q.getOptions().stream()
                .map(o -> new McqOptionView(o.getId(), o.getText()))
                .toList();
    }

    public record VariantRef(
            String questionId,
            int variantNo,
            String variantType,
            int difficulty,
            boolean hasSolution,
            String questionTextPreview) {}

    public record QuestionFamily(
            String parentQuestionId,
            int paperQuestionNo,
            String activeQuestionId,
            QuestionPublic pyq,
            List<VariantRef> variants) {}

    /** Detail — includes answer for reveal / practice submit. */
    public record QuestionDetail(
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
            java.util.List<String> concepts,
            boolean hasDiagram,
            boolean hasEquation,
            boolean formulaRelevant,
            boolean hasSolution,
            boolean answerOnly,
            String questionImageUrl,
            String solutionImageUrl,
            String questionTextPreview,
            String solutionTextPreview,
            java.util.List<McqOptionView> options,
            String sourceType,
            String parentQuestionId,
            int variantNo,
            String variantType,
            String questionFormat,
            String assertion,
            String reason,
            java.util.List<McqOptionView> statements,
            java.util.List<McqOptionView> matchListA,
            java.util.List<McqOptionView> matchListB,
            String questionDiagramSvg,
            String solutionDiagramSvg
    ) {
        static QuestionDetail from(Question q) {
            return new QuestionDetail(
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
                    QuestionVariantMapper.nullToEmpty(q.getQuestionFormat()),
                    QuestionVariantMapper.nullToEmpty(q.getAssertion()),
                    QuestionVariantMapper.nullToEmpty(q.getReason()),
                    QuestionVariantMapper.mapStatements(q),
                    QuestionVariantMapper.mapMatchListA(q),
                    QuestionVariantMapper.mapMatchListB(q),
                    QuestionVariantMapper.nullToEmpty(q.getQuestionDiagramSvg()),
                    QuestionVariantMapper.nullToEmpty(q.getSolutionDiagramSvg())
            );
        }
    }

    private static boolean hasRenderableSolution(Question q) {
        if (q == null) {
            return false;
        }
        if (q.isHasSolution()) {
            return true;
        }
        String image = nullToEmpty(q.getSolutionImageUrl());
        if (!image.isBlank()) {
            return true;
        }
        String text = nullToEmpty(q.getSolutionTextPreview());
        return !text.isBlank();
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
