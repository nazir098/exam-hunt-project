package com.neetlu.examhunt.web;

import com.neetlu.examhunt.security.AdminAuthorization;
import com.neetlu.examhunt.service.QuestionFeedbackService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/question-feedback")
public class AdminQuestionFeedbackController {

    private final QuestionFeedbackService feedbackService;
    private final AdminAuthorization adminAuthorization;

    public AdminQuestionFeedbackController(
            QuestionFeedbackService feedbackService, AdminAuthorization adminAuthorization) {
        this.feedbackService = feedbackService;
        this.adminAuthorization = adminAuthorization;
    }

    @GetMapping
    public QuestionFeedbackService.AdminFeedbackPage list(
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey,
            @RequestParam(required = false) String questionId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        return feedbackService.listForAdmin(questionId, page, size);
    }
}
