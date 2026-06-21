package com.neetlu.examhunt.web;

import com.neetlu.examhunt.service.ProductAnalyticsService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
public class ProductAnalyticsController {

    private final ProductAnalyticsService analyticsService;

    public ProductAnalyticsController(ProductAnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @PostMapping("/events")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void ingest(@AuthenticationPrincipal String userId, @RequestBody IngestBody body) {
        List<ProductAnalyticsService.EventInput> events =
                body.events() == null
                        ? List.of()
                        : body.events().stream()
                                .map(e -> new ProductAnalyticsService.EventInput(e.name(), e.properties()))
                                .toList();
        analyticsService.ingest(userId, body.sessionId(), events);
    }

    public record IngestBody(String sessionId, List<EventBody> events) {}

    public record EventBody(String name, Map<String, Object> properties) {}
}
