package com.neetlu.examhunt.web;

import com.neetlu.examhunt.service.QuestionFeedbackService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/questions")
public class QuestionFeedbackController {

    private final QuestionFeedbackService feedbackService;

    public QuestionFeedbackController(QuestionFeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    @PutMapping("/{questionId}/feedback")
    public QuestionFeedbackService.FeedbackView submit(
            @AuthenticationPrincipal String userId,
            @PathVariable String questionId,
            @RequestBody FeedbackBody body) {
        return feedbackService.submitFeedback(
                userId,
                questionId,
                body.score() == null ? 0 : body.score(),
                body.comment(),
                body.category(),
                body.context());
    }

    @GetMapping("/{questionId}/feedback")
    public QuestionFeedbackService.FeedbackView get(
            @AuthenticationPrincipal String userId, @PathVariable String questionId) {
        return feedbackService.getUserFeedback(userId, questionId);
    }

    public record FeedbackBody(Integer score, String comment, String category, String context) {}
}
