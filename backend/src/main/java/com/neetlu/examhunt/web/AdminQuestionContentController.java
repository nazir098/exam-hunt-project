package com.neetlu.examhunt.web;

import com.neetlu.examhunt.security.AdminAuthorization;
import com.neetlu.examhunt.service.AdminQuestionContentFormatService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/questions/{questionId}/content-format")
public class AdminQuestionContentController {

    private final AdminQuestionContentFormatService contentFormatService;
    private final AdminAuthorization adminAuthorization;

    public AdminQuestionContentController(
            AdminQuestionContentFormatService contentFormatService, AdminAuthorization adminAuthorization) {
        this.contentFormatService = contentFormatService;
        this.adminAuthorization = adminAuthorization;
    }

    @GetMapping
    public AdminQuestionContentFormatService.ContentFormatView get(
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey,
            @PathVariable String questionId) {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        return contentFormatService.get(questionId);
    }

    @PostMapping("/raw-text")
    public AdminQuestionContentFormatService.ContentFormatView saveRawText(
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey,
            @PathVariable String questionId,
            @RequestBody AdminQuestionContentFormatService.RawTextRequest body) {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        return contentFormatService.saveRawText(questionId, body.target(), body.text());
    }

    @PostMapping("/fix-raw-text-latex")
    public AdminQuestionContentFormatService.ContentFormatView fixRawTextLatex(
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey,
            @PathVariable String questionId,
            @RequestBody AdminQuestionContentFormatService.RawTextRequest body) {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        return contentFormatService.fixRawTextLatex(questionId, body.target(), body.text());
    }

    @PostMapping("/content-asset/add")
    public AdminQuestionContentFormatService.ContentFormatView addContentAsset(
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey,
            @PathVariable String questionId,
            @RequestBody AdminQuestionContentFormatService.ContentAssetRequest body) {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        return contentFormatService.addContentAsset(questionId, body);
    }

    @PostMapping("/content-asset/crop")
    public AdminQuestionContentFormatService.ContentFormatView cropContentAsset(
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey,
            @PathVariable String questionId,
            @RequestBody AdminQuestionContentFormatService.ContentAssetRequest body) {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        return contentFormatService.cropContentAsset(questionId, body);
    }
}
