package com.neetlu.examhunt.service;

import com.neetlu.examhunt.config.PublicApiCacheProperties;
import com.neetlu.examhunt.model.ContentPack;
import com.neetlu.examhunt.repository.ContentPackRepository;
import com.neetlu.examhunt.repository.QuestionRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Service
public class ExamCatalogService {

    private static final List<Integer> NEET_YEARS = List.of(
            2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016
    );

    private static final List<ExamDefinition> EXAMS = List.of(
            new ExamDefinition("NEET", "NEET", "available",
                    "Previous year NEET (UG) papers — browse, study, and practice."),
            new ExamDefinition("JEE Main", "JEE Main", "coming_soon",
                    "JEE Main PYQs are being prepared. Check back soon."),
            new ExamDefinition("JEE Advanced", "JEE Advanced", "coming_soon",
                    "JEE Advanced PYQs are on the roadmap."),
            new ExamDefinition("UPSC", "UPSC", "coming_soon",
                    "UPSC practice content is planned for a future release."),
            new ExamDefinition("CAT", "CAT", "coming_soon",
                    "CAT PYQs will be added in a future update.")
    );

    private final ContentPackRepository packRepository;
    private final QuestionRepository questionRepository;
    private final PublicApiCacheProperties cacheProperties;
    private final AtomicLong cacheVersion = new AtomicLong(1);
    private volatile Cached<List<ExamCatalogEntry>> cachedCatalog;

    public ExamCatalogService(
            ContentPackRepository packRepository,
            QuestionRepository questionRepository,
            PublicApiCacheProperties cacheProperties) {
        this.packRepository = packRepository;
        this.questionRepository = questionRepository;
        this.cacheProperties = cacheProperties;
    }

    public long cacheVersion() {
        return cacheVersion.get();
    }

    public void invalidateCache() {
        cachedCatalog = null;
        cacheVersion.incrementAndGet();
    }

    public List<ExamCatalogEntry> getCatalog() {
        Cached<List<ExamCatalogEntry>> snapshot = cachedCatalog;
        if (snapshot != null && !snapshot.expired()) {
            return snapshot.value();
        }
        List<ExamCatalogEntry> fresh = loadCatalog();
        cachedCatalog = new Cached<>(fresh, Instant.now().plusSeconds(cacheProperties.memoryTtlSeconds()));
        return fresh;
    }

    private List<ExamCatalogEntry> loadCatalog() {
        List<ContentPack> neetPacks =
                ContentPackCatalog.dedupeByPackId(
                                packRepository.findByExamIgnoreCaseOrderByYearDesc("NEET"))
                        .stream()
                        .filter(p -> !p.getPackId().startsWith("DEMO_"))
                        .toList();

        Map<Integer, ContentPack> packByYear = neetPacks.stream()
                .collect(Collectors.toMap(
                        ContentPack::getYear, p -> p, ContentPackCatalog::preferCanonical, LinkedHashMap::new));

        List<ExamCatalogEntry> out = new ArrayList<>();
        for (ExamDefinition def : EXAMS) {
            if ("NEET".equals(def.id())) {
                List<YearCatalogEntry> years = NEET_YEARS.stream()
                        .map(year -> {
                            ContentPack pack = packByYear.get(year);
                            if (pack != null) {
                                long count = questionRepository.countByPackId(pack.getPackId());
                                return new YearCatalogEntry(
                                        year,
                                        "available",
                                        pack.getPackId(),
                                        count,
                                        null
                                );
                            }
                            return new YearCatalogEntry(
                                    year,
                                    "coming_soon",
                                    null,
                                    0,
                                    "This year is being digitized — coming soon."
                            );
                        })
                        .toList();

                long totalQuestions = years.stream().mapToLong(YearCatalogEntry::questionCount).sum();
                long availableYears = years.stream().filter(y -> "available".equals(y.status())).count();
                String status = availableYears > 0 ? "available" : "coming_soon";
                out.add(new ExamCatalogEntry(
                        def.id(),
                        def.name(),
                        status,
                        def.description(),
                        totalQuestions,
                        (int) availableYears,
                        years
                ));
            } else {
                out.add(new ExamCatalogEntry(
                        def.id(),
                        def.name(),
                        def.status(),
                        def.description(),
                        0,
                        0,
                        List.of()
                ));
            }
        }
        return out;
    }

    public boolean isExamAvailable(String examId) {
        return getCatalog().stream()
                .anyMatch(e -> e.id().equalsIgnoreCase(examId) && "available".equals(e.status()));
    }

    public record ExamCatalogEntry(
            String id,
            String name,
            String status,
            String description,
            long totalQuestions,
            int availableYears,
            List<YearCatalogEntry> years
    ) {}

    public record YearCatalogEntry(
            int year,
            String status,
            String packId,
            long questionCount,
            String message
    ) {}

    private record ExamDefinition(String id, String name, String status, String description) {}

    private record Cached<T>(T value, Instant expiresAt) {
        boolean expired() {
            return Instant.now().isAfter(expiresAt);
        }
    }
}
