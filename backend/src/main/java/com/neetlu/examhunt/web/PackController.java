package com.neetlu.examhunt.web;

import com.neetlu.examhunt.config.PublicApiCacheProperties;
import com.neetlu.examhunt.model.ContentPack;
import com.neetlu.examhunt.repository.ContentPackRepository;
import com.neetlu.examhunt.service.PackCatalogService;
import com.neetlu.examhunt.service.PackStatsService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/packs")
public class PackController {

    private final PackCatalogService packCatalogService;
    private final ContentPackRepository packRepository;
    private final PackStatsService packStatsService;
    private final PublicApiCacheProperties cacheProperties;

    public PackController(
            PackCatalogService packCatalogService,
            ContentPackRepository packRepository,
            PackStatsService packStatsService,
            PublicApiCacheProperties cacheProperties) {
        this.packCatalogService = packCatalogService;
        this.packRepository = packRepository;
        this.packStatsService = packStatsService;
        this.cacheProperties = cacheProperties;
    }

    @GetMapping
    public ResponseEntity<List<PackSummary>> listPacks() {
        return PublicCacheResponses.catalogOk(
                packCatalogService.listPacks(), packCatalogService.cacheVersion(), cacheProperties);
    }

    @GetMapping("/{packId}")
    public PackDetail getPack(@PathVariable String packId) {
        ContentPack pack = packRepository.findByPackId(packId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pack not found"));
        return new PackDetail(
                pack.getPackId(),
                pack.getExam(),
                pack.getYear(),
                pack.getSourceFolder(),
                pack.getStats(),
                pack.getFacets(),
                packStatsService.readPyqCount(pack));
    }

    @GetMapping("/{packId}/facets")
    public Map<String, Object> facets(@PathVariable String packId) {
        ContentPack pack = packRepository.findByPackId(packId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pack not found"));
        return pack.getFacets() != null ? pack.getFacets() : Map.of();
    }

    public record PackSummary(
            String packId,
            String exam,
            int year,
            String sourceFolder,
            long questionCount,
            Map<String, Object> facets
    ) {}

    public record PackDetail(
            String packId,
            String exam,
            int year,
            String sourceFolder,
            Map<String, Object> stats,
            Map<String, Object> facets,
            long questionCount
    ) {}
}
