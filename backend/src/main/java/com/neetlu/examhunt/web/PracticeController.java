package com.neetlu.examhunt.web;

import com.neetlu.examhunt.model.PracticeSession;
import com.neetlu.examhunt.model.Question;
import com.neetlu.examhunt.service.FormulaEligibility;
import com.neetlu.examhunt.service.PracticeService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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
                        body.startQuestionId(),
                        body.mode(),
                        body.questionCount()));
        return practiceService.toView(session);
    }

    @PostMapping("/sessions/{sessionId}/retake-test")
    public PracticeService.SessionView retakeTest(
            @AuthenticationPrincipal String userId,
            @PathVariable String sessionId,
            @RequestBody RetakeTestBody body) {
        PracticeSession session = practiceService.createRetakeTestSession(userId, sessionId, body.filter());
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

    @GetMapping("/wrong-attempts")
    public List<PracticeService.WrongAttemptView> wrongAttempts(
            @AuthenticationPrincipal String userId,
            @RequestParam(required = false) String mode,
            @RequestParam(required = false) String subject,
            @RequestParam(required = false) String chapter,
            @RequestParam(required = false) String exam,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String sessionId) {
        return practiceService.listWrongAttempts(userId, mode, subject, chapter, exam, year, sessionId);
    }

    @GetMapping("/sessions/{sessionId}/result")
    public PracticeService.SessionResultView sessionResult(
            @AuthenticationPrincipal String userId, @PathVariable String sessionId) {
        return practiceService.getSessionResult(userId, sessionId);
    }

    @PostMapping("/submit")
    public PracticeService.SubmitResult submit(
            @AuthenticationPrincipal String userId, @RequestBody SubmitBody body) {
        return practiceService.submitAnswer(
                userId,
                new PracticeService.SubmitRequest(body.sessionId(), body.questionId(), body.selectedAnswer()));
    }

    @PostMapping("/skip")
    public PracticeService.SkipResult skip(
            @AuthenticationPrincipal String userId, @RequestBody SkipBody body) {
        return practiceService.skipQuestion(
                userId, new PracticeService.SkipRequest(body.sessionId(), body.questionId()));
    }

    @PostMapping("/sessions/{sessionId}/mark-review")
    public PracticeService.SessionView markReview(
            @AuthenticationPrincipal String userId,
            @PathVariable String sessionId,
            @RequestBody MarkReviewBody body) {
        return practiceService.toggleMarkForReview(userId, sessionId, body.questionId());
    }

    @PostMapping("/sessions/{sessionId}/finish")
    public PracticeService.SessionResultView finishSession(
            @AuthenticationPrincipal String userId, @PathVariable String sessionId) {
        return practiceService.finishSession(userId, sessionId);
    }

    @GetMapping("/questions/{questionId}")
    public QuestionPracticeView practiceQuestion(
            @AuthenticationPrincipal String userId, @PathVariable String questionId) {
        Question q = practiceService.requireQuestion(questionId);
        return QuestionPracticeView.from(q);
    }

    /** Official solution image — revealed after hint ladder in study assistant. */
    @GetMapping("/questions/{questionId}/solution")
    public SolutionRevealView practiceSolution(
            @AuthenticationPrincipal String userId, @PathVariable String questionId) {
        Question q = practiceService.requireQuestion(questionId);
        return new SolutionRevealView(
                q.isHasSolution(), q.isHasSolution() ? nullToEmpty(q.getSolutionImageUrl()) : "");
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
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
            String startQuestionId,
            String mode,
            Integer questionCount) {}

    public record RetakeTestBody(@NotBlank String filter) {}

    public record SubmitBody(
            @NotBlank String sessionId, @NotBlank String questionId, @NotBlank String selectedAnswer) {}

    public record SkipBody(@NotBlank String sessionId, @NotBlank String questionId) {}

    public record MarkReviewBody(@NotBlank String questionId) {}

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

    public record SolutionRevealView(boolean hasSolution, String solutionImageUrl) {}
}
