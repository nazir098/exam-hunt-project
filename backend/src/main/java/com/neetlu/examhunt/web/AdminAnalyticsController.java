package com.neetlu.examhunt.web;

import com.neetlu.examhunt.security.AdminAuthorization;
import com.neetlu.examhunt.service.ProductAnalyticsService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/analytics")
public class AdminAnalyticsController {

    private final ProductAnalyticsService analyticsService;
    private final AdminAuthorization adminAuthorization;

    public AdminAnalyticsController(
            ProductAnalyticsService analyticsService, AdminAuthorization adminAuthorization) {
        this.analyticsService = analyticsService;
        this.adminAuthorization = adminAuthorization;
    }

    @GetMapping("/summary")
    public ProductAnalyticsService.SummaryView summary(
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey,
            @RequestParam(defaultValue = "7") int days) {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        return analyticsService.summary(days);
    }
}
