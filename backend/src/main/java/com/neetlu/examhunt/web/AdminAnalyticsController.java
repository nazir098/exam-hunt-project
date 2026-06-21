package com.neetlu.examhunt.web;

import com.neetlu.examhunt.service.ProductAnalyticsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/analytics")
public class AdminAnalyticsController {

    private final ProductAnalyticsService analyticsService;

    public AdminAnalyticsController(ProductAnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/summary")
    public ProductAnalyticsService.SummaryView summary(@RequestParam(defaultValue = "7") int days) {
        return analyticsService.summary(days);
    }
}
