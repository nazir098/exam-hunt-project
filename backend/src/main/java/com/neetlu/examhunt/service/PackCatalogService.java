package com.neetlu.examhunt.service;

import com.neetlu.examhunt.config.PublicApiCacheProperties;
import com.neetlu.examhunt.model.ContentPack;
import com.neetlu.examhunt.repository.ContentPackRepository;
import com.neetlu.examhunt.web.PackController.PackSummary;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class PackCatalogService {

    private final ContentPackRepository packRepository;
    private final PackStatsService packStatsService;
    private final PublicApiCacheProperties cacheProperties;
    private final AtomicLong cacheVersion = new AtomicLong(1);
    private volatile Cached<List<PackSummary>> cachedList;

    public PackCatalogService(
            ContentPackRepository packRepository,
            PackStatsService packStatsService,
            PublicApiCacheProperties cacheProperties) {
        this.packRepository = packRepository;
        this.packStatsService = packStatsService;
        this.cacheProperties = cacheProperties;
    }

    public long cacheVersion() {
        return cacheVersion.get();
    }

    public List<PackSummary> listPacks() {
        Cached<List<PackSummary>> snapshot = cachedList;
        if (snapshot != null && !snapshot.expired()) {
            return snapshot.value();
        }
        List<PackSummary> fresh = loadPacks();
        cachedList = new Cached<>(fresh, Instant.now().plusSeconds(cacheProperties.memoryTtlSeconds()));
        return fresh;
    }

    public void invalidateCache() {
        cachedList = null;
        cacheVersion.incrementAndGet();
    }

    private List<PackSummary> loadPacks() {
        return ContentPackCatalog.dedupeByPackId(packRepository.findAllByOrderByYearDesc()).stream()
                .filter(p -> !p.getPackId().startsWith("DEMO_"))
                .map(this::toSummary)
                .toList();
    }

    private PackSummary toSummary(ContentPack p) {
        return new PackSummary(
                p.getPackId(),
                p.getExam(),
                p.getYear(),
                p.getSourceFolder(),
                packStatsService.readPyqCount(p),
                p.getFacets());
    }

    private record Cached<T>(T value, Instant expiresAt) {
        boolean expired() {
            return Instant.now().isAfter(expiresAt);
        }
    }
}
