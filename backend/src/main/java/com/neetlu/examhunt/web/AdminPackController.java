package com.neetlu.examhunt.web;

import com.neetlu.examhunt.repository.ContentPackRepository;
import com.neetlu.examhunt.security.AdminAuthorization;
import com.neetlu.examhunt.service.ContentPackCatalog;
import com.neetlu.examhunt.service.ManifestImportService;
import com.neetlu.examhunt.service.PackStatsService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/admin/packs")
public class AdminPackController {

    private final ContentPackRepository packRepository;
    private final PackStatsService packStatsService;
    private final ManifestImportService importService;
    private final AdminAuthorization adminAuthorization;

    public AdminPackController(
            ContentPackRepository packRepository,
            PackStatsService packStatsService,
            ManifestImportService importService,
            AdminAuthorization adminAuthorization) {
        this.packRepository = packRepository;
        this.packStatsService = packStatsService;
        this.importService = importService;
        this.adminAuthorization = adminAuthorization;
    }

    @GetMapping
    public ResponseEntity<?> listPacks(
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey) {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        List<PackRow> packs = ContentPackCatalog.dedupeByPackId(packRepository.findAllByOrderByYearDesc()).stream()
                .map(p -> new PackRow(
                        p.getPackId(),
                        p.getExam(),
                        p.getYear(),
                        p.getSourceFolder(),
                        packStatsService.readPyqCount(p),
                        p.getPackId().startsWith("DEMO_")))
                .toList();
        return ResponseEntity.ok(Map.of("packs", packs, "count", packs.size()));
    }

    @DeleteMapping("/{packId}")
    public ResponseEntity<?> deletePack(
            @PathVariable String packId,
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey) {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        try {
            var result = importService.removePack(packId);
            return ResponseEntity.ok(Map.of(
                    "packId", result.packId(),
                    "questionsRemoved", result.questionsRemoved(),
                    "message", "Removed pack " + result.packId()));
        } catch (NoSuchElementException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }

    public record PackRow(
            String packId,
            String exam,
            int year,
            String sourceFolder,
            long questionCount,
            boolean demo) {}
}
