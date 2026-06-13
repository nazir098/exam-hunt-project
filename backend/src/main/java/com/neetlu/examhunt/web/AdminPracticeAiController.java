package com.neetlu.examhunt.web;

import com.neetlu.examhunt.security.AdminAuthorization;
import com.neetlu.examhunt.service.PracticeAiService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/practice-ai")
public class AdminPracticeAiController {

    private final PracticeAiService practiceAiService;
    private final AdminAuthorization adminAuthorization;

    public AdminPracticeAiController(PracticeAiService practiceAiService, AdminAuthorization adminAuthorization) {
        this.practiceAiService = practiceAiService;
        this.adminAuthorization = adminAuthorization;
    }

    @GetMapping("/prompt-features")
    public List<PracticeAiService.PromptFeatureInfo> promptFeatures(
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey) {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        return practiceAiService.listPromptFeatures();
    }

    @GetMapping("/prompt")
    public PracticeAiService.PromptView resolvePrompt(
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey,
            @RequestParam String feature,
            @RequestParam(required = false) String questionId,
            @RequestParam(required = false) String selectedAnswer) {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        return practiceAiService.resolvePrompt(userId, feature, questionId, selectedAnswer);
    }
}
