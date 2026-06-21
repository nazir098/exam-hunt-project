package com.neetlu.examhunt.service;

import com.neetlu.examhunt.config.AnalyticsProperties;
import com.neetlu.examhunt.repository.AnalyticsEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductAnalyticsServiceTest {

    @Mock
    private AnalyticsEventRepository repository;

    private ProductAnalyticsService service;

    @BeforeEach
    void setUp() {
        service = new ProductAnalyticsService(repository, new AnalyticsProperties(true));
    }

    @Test
    void ingestsSanitizedEvents() {
        service.ingest(
                "user-1",
                "session-abc",
                List.of(
                        new ProductAnalyticsService.EventInput(
                                "page_view", Map.of("path", "/analytics", "title", "Analytics")),
                        new ProductAnalyticsService.EventInput("login", Map.of())));

        ArgumentCaptor<Iterable<com.neetlu.examhunt.model.AnalyticsEvent>> captor =
                ArgumentCaptor.forClass(Iterable.class);
        verify(repository).saveAll(captor.capture());
        int count = 0;
        for (com.neetlu.examhunt.model.AnalyticsEvent event : captor.getValue()) {
            count++;
            assertEquals("user-1", event.getUserId());
            assertEquals("session-abc", event.getSessionId());
        }
        assertEquals(2, count);
    }

    @Test
    void skipsWhenDisabled() {
        service = new ProductAnalyticsService(repository, new AnalyticsProperties(false));
        service.ingest("user-1", "session-abc", List.of(new ProductAnalyticsService.EventInput("login", Map.of())));
        verify(repository, never()).saveAll(any());
    }

    @Test
    void summaryAggregatesTopEvents() {
        when(repository.findTop500ByCreatedAtAfterOrderByCreatedAtDesc(any()))
                .thenReturn(List.of(event("page_view"), event("page_view"), event("login")));

        ProductAnalyticsService.SummaryView summary = service.summary(7);
        assertEquals(3, summary.sampleSize());
        assertTrue(summary.topEvents().stream().anyMatch(e -> "page_view".equals(e.name()) && e.count() == 2));
    }

    private static com.neetlu.examhunt.model.AnalyticsEvent event(String name) {
        com.neetlu.examhunt.model.AnalyticsEvent event = new com.neetlu.examhunt.model.AnalyticsEvent();
        event.setName(name);
        event.setSessionId("s1");
        event.setCreatedAt(java.time.Instant.now());
        return event;
    }
}
