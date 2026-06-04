package com.neetlu.examhunt.web;

import com.neetlu.examhunt.security.AdminAuthorization;
import com.neetlu.examhunt.service.PlatformSettingsService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/settings")
public class AdminSettingsController {

    private final PlatformSettingsService platformSettingsService;
    private final AdminAuthorization adminAuthorization;

    public AdminSettingsController(
            PlatformSettingsService platformSettingsService, AdminAuthorization adminAuthorization) {
        this.platformSettingsService = platformSettingsService;
        this.adminAuthorization = adminAuthorization;
    }

    @GetMapping
    public PlatformSettingsService.AdminSettingsView get(
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey) {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        return platformSettingsService.toAdminView(platformSettingsService.requireSettings());
    }

    @PutMapping
    public PlatformSettingsService.AdminSettingsView update(
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey,
            @RequestBody PlatformSettingsService.UpdateSettingsRequest body) {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        return platformSettingsService.update(body);
    }
}
