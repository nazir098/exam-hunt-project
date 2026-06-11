package com.neetlu.examhunt.web;

import com.neetlu.examhunt.security.AdminAuthorization;
import com.neetlu.examhunt.service.AdminQuestionService;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/questions")
public class AdminQuestionController {

    private final AdminQuestionService adminQuestionService;
    private final AdminAuthorization adminAuthorization;

    public AdminQuestionController(
            AdminQuestionService adminQuestionService, AdminAuthorization adminAuthorization) {
        this.adminQuestionService = adminQuestionService;
        this.adminAuthorization = adminAuthorization;
    }

    @GetMapping("/search")
    public Page<AdminQuestionService.QuestionSearchRow> search(
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey,
            @RequestParam String q,
            @RequestParam(required = false) String packId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size) {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        return adminQuestionService.search(packId, q, page, size);
    }

    @GetMapping("/{questionId}")
    public AdminQuestionService.AdminQuestionDetail get(
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey,
            @PathVariable String questionId) {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        return adminQuestionService.get(questionId);
    }

    @PatchMapping("/{questionId}")
    public AdminQuestionService.AdminQuestionDetail updateContent(
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey,
            @PathVariable String questionId,
            @RequestBody AdminQuestionService.UpdateContentRequest body) {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        return adminQuestionService.updateContent(questionId, body);
    }

    @PutMapping("/{questionId}/enrichment")
    public AdminQuestionService.AdminQuestionDetail updateEnrichment(
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey,
            @PathVariable String questionId,
            @RequestBody AdminQuestionService.UpdateEnrichmentRequest body) {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        return adminQuestionService.updateEnrichment(questionId, body);
    }
}
