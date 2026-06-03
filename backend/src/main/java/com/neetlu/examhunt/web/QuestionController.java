package com.neetlu.examhunt.web;

import com.neetlu.examhunt.model.Question;
import com.neetlu.examhunt.repository.QuestionRepository;
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

@RestController
@RequestMapping("/api/questions")
public class QuestionController {

    private final QuestionRepository questionRepository;

    public QuestionController(QuestionRepository questionRepository) {
        this.questionRepository = questionRepository;
    }

    @GetMapping
    public Page<QuestionPublic> list(
            @RequestParam String packId,
            @RequestParam(required = false) String subject,
            @RequestParam(required = false) String chapter,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size
    ) {
        PageRequest pageable = PageRequest.of(page, Math.min(size, 100), Sort.by("questionNo"));
        Page<Question> result;
        if (subject != null && !subject.isBlank() && chapter != null && !chapter.isBlank()) {
            result = questionRepository.findByPackIdAndSubjectIgnoreCaseAndChapterIgnoreCase(
                    packId, subject, chapter, pageable);
        } else if (subject != null && !subject.isBlank()) {
            result = questionRepository.findByPackIdAndSubjectIgnoreCase(packId, subject, pageable);
        } else {
            result = questionRepository.findByPackId(packId, pageable);
        }
        return result.map(QuestionPublic::from);
    }

    @GetMapping("/{questionId}")
    public QuestionDetail get(@PathVariable String questionId) {
        Question q = questionRepository.findByQuestionId(questionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));
        return QuestionDetail.from(q);
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
            String questionTextPreview
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
                    q.isHasSolution(),
                    q.isAnswerOnly(),
                    q.getQuestionImageUrl(),
                    q.isHasSolution() ? q.getSolutionImageUrl() : "",
                    q.getQuestionTextPreview()
            );
        }
    }

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
            boolean hasSolution,
            boolean answerOnly,
            String questionImageUrl,
            String solutionImageUrl,
            String questionTextPreview,
            String solutionTextPreview
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
                    q.isHasSolution(),
                    q.isAnswerOnly(),
                    q.getQuestionImageUrl(),
                    q.getSolutionImageUrl(),
                    q.getQuestionTextPreview(),
                    q.getSolutionTextPreview()
            );
        }
    }
}
