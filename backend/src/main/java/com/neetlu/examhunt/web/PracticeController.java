package com.neetlu.examhunt.web;

import com.neetlu.examhunt.model.PracticeSession;
import com.neetlu.examhunt.model.Question;
import com.neetlu.examhunt.service.FormulaEligibility;
import com.neetlu.examhunt.service.PracticeService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/practice")
public class PracticeController {

    private final PracticeService practiceService;

    public PracticeController(PracticeService practiceService) {
        this.practiceService = practiceService;
    }

    @PostMapping("/sessions")
    public PracticeService.SessionView createSession(
            @AuthenticationPrincipal String userId, @RequestBody CreateSessionBody body) {
        PracticeSession session = practiceService.createSession(
                userId,
                new PracticeService.CreateSessionRequest(
                        body.exam(),
                        body.packId(),
                        body.subject(),
                        body.chapter(),
                        body.topic(),
                        body.difficulty(),
                        body.adaptive(),
                        body.startQuestionId()));
        return practiceService.toView(session);
    }

    @GetMapping("/sessions/{sessionId}")
    public PracticeService.SessionView getSession(
            @AuthenticationPrincipal String userId, @PathVariable String sessionId) {
        return practiceService.toView(practiceService.requireSession(userId, sessionId));
    }

    @GetMapping("/progress")
    public PracticeService.ProgressSummary progress(@AuthenticationPrincipal String userId) {
        return practiceService.progress(userId);
    }

    @PostMapping("/submit")
    public PracticeService.SubmitResult submit(
            @AuthenticationPrincipal String userId, @RequestBody SubmitBody body) {
        return practiceService.submitAnswer(
                userId,
                new PracticeService.SubmitRequest(body.sessionId(), body.questionId(), body.selectedAnswer()));
    }

    @GetMapping("/questions/{questionId}")
    public QuestionPracticeView practiceQuestion(
            @AuthenticationPrincipal String userId, @PathVariable String questionId) {
        Question q = practiceService.requireQuestion(questionId);
        return QuestionPracticeView.from(q);
    }

    @PutMapping("/questions/{questionId}/rating")
    public PracticeService.RatingView rate(
            @AuthenticationPrincipal String userId,
            @PathVariable String questionId,
            @RequestBody RateBody body) {
        return practiceService.rateQuestion(userId, questionId, body.score(), body.comment());
    }

    @GetMapping("/questions/{questionId}/rating")
    public PracticeService.RatingView getRating(
            @AuthenticationPrincipal String userId, @PathVariable String questionId) {
        return practiceService.getUserRating(userId, questionId);
    }

    public record CreateSessionBody(
            String exam,
            @NotBlank String packId,
            String subject,
            String chapter,
            String topic,
            String difficulty,
            boolean adaptive,
            String startQuestionId) {}

    public record SubmitBody(
            @NotBlank String sessionId, @NotBlank String questionId, @NotBlank String selectedAnswer) {}

    public record RateBody(@Min(1) @Max(5) int score, String comment) {}

    public record QuestionPracticeView(
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
            boolean formulaRelevant,
            String questionImageUrl,
            String questionTextPreview) {
        static QuestionPracticeView from(Question q) {
            return new QuestionPracticeView(
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
                    FormulaEligibility.questionNeedsFormula(q),
                    q.getQuestionImageUrl(),
                    q.getQuestionTextPreview());
        }
    }
}
