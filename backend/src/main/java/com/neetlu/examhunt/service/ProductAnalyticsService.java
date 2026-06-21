package com.neetlu.examhunt.service;

import com.neetlu.examhunt.config.AnalyticsProperties;
import com.neetlu.examhunt.model.AnalyticsEvent;
import com.neetlu.examhunt.repository.AnalyticsEventRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ProductAnalyticsService {

    private static final int MAX_BATCH = 20;
    private static final int MAX_NAME_LEN = 64;
    private static final int MAX_PROP_KEY_LEN = 64;
    private static final int MAX_PROP_VAL_LEN = 256;
    private static final int MAX_PROPS = 20;

    private final AnalyticsEventRepository repository;
    private final AnalyticsProperties properties;

    public ProductAnalyticsService(AnalyticsEventRepository repository, AnalyticsProperties properties) {
        this.repository = repository;
        this.properties = properties;
    }

    public void ingest(String userId, String sessionId, List<EventInput> events) {
        if (!properties.eventsEnabled() || events == null || events.isEmpty()) {
            return;
        }
        String safeSession = sanitize(sessionId, 64);
        if (safeSession.isBlank()) {
            safeSession = "anonymous";
        }
        int limit = Math.min(events.size(), MAX_BATCH);
        List<AnalyticsEvent> docs = new ArrayList<>(limit);
        for (int i = 0; i < limit; i++) {
            EventInput input = events.get(i);
            if (input == null || input.name() == null) {
                continue;
            }
            String name = sanitize(input.name(), MAX_NAME_LEN);
            if (name.isBlank()) {
                continue;
            }
            AnalyticsEvent doc = new AnalyticsEvent();
            doc.setName(name);
            doc.setUserId(userId);
            doc.setSessionId(safeSession);
            doc.setProperties(sanitizeProperties(input.properties()));
            String path = input.properties() == null ? null : asString(input.properties().get("path"));
            if (path != null) {
                doc.setPath(sanitize(path, 256));
            }
            docs.add(doc);
        }
        if (!docs.isEmpty()) {
            repository.saveAll(docs);
        }
    }

    public SummaryView summary(int days) {
        int windowDays = Math.max(1, Math.min(days, 90));
        Instant since = Instant.now().minus(windowDays, ChronoUnit.DAYS);
        List<AnalyticsEvent> recent = repository.findTop500ByCreatedAtAfterOrderByCreatedAtDesc(since);

        Map<String, Long> counts = new LinkedHashMap<>();
        Map<String, Long> dailyPageViews = new LinkedHashMap<>();
        Map<String, Boolean> sessions = new HashMap<>();

        for (AnalyticsEvent event : recent) {
            counts.merge(event.getName(), 1L, Long::sum);
            if (event.getSessionId() != null) {
                sessions.put(event.getSessionId(), Boolean.TRUE);
            }
            if ("page_view".equals(event.getName()) && event.getCreatedAt() != null) {
                LocalDate day = event.getCreatedAt().atZone(ZoneOffset.UTC).toLocalDate();
                dailyPageViews.merge(day.toString(), 1L, Long::sum);
            }
        }

        List<EventCount> topEvents = counts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue(Comparator.reverseOrder()))
                .limit(12)
                .map(e -> new EventCount(e.getKey(), e.getValue()))
                .toList();

        List<DailyCount> daily = dailyPageViews.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> new DailyCount(e.getKey(), e.getValue()))
                .toList();

        return new SummaryView(recent.size(), sessions.size(), windowDays, topEvents, daily);
    }

    private static Map<String, Object> sanitizeProperties(Map<String, Object> raw) {
        if (raw == null || raw.isEmpty()) {
            return Map.of();
        }
        Map<String, Object> out = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : raw.entrySet()) {
            if (out.size() >= MAX_PROPS) {
                break;
            }
            String key = sanitize(entry.getKey(), MAX_PROP_KEY_LEN);
            if (key.isBlank()) {
                continue;
            }
            Object value = entry.getValue();
            if (value instanceof Number number) {
                out.put(key, number);
            } else if (value instanceof Boolean bool) {
                out.put(key, bool);
            } else if (value != null) {
                out.put(key, sanitize(String.valueOf(value), MAX_PROP_VAL_LEN));
            }
        }
        return out;
    }

    private static String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private static String sanitize(String value, int maxLen) {
        if (value == null) {
            return "";
        }
        return value.strip().replaceAll("[\\x00-\\x1F]", "").substring(0, Math.min(value.strip().length(), maxLen));
    }

    public record EventInput(String name, Map<String, Object> properties) {}

    public record EventCount(String name, long count) {}

    public record DailyCount(String day, long count) {}

    public record SummaryView(
            long sampleSize,
            long uniqueSessions,
            int windowDays,
            List<EventCount> topEvents,
            List<DailyCount> dailyPageViews) {}
}
