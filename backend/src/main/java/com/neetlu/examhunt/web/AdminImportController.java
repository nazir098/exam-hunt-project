package com.neetlu.examhunt.web;

import com.neetlu.examhunt.security.AdminAuthorization;
import com.neetlu.examhunt.service.ManifestImportService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/import")
public class AdminImportController {

    private final ManifestImportService importService;
    private final AdminAuthorization adminAuthorization;

    public AdminImportController(ManifestImportService importService, AdminAuthorization adminAuthorization) {
        this.importService = importService;
        this.adminAuthorization = adminAuthorization;
    }

    @GetMapping("/folders")
    public ResponseEntity<?> listFolders(
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey)
            throws IOException {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        var folders = importService.listImportableFolders();
        return ResponseEntity.ok(Map.of("folders", folders, "count", folders.size()));
    }

    @PostMapping("/folder/{folderName}")
    public ResponseEntity<?> importFolder(
            @PathVariable String folderName,
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey)
            throws IOException {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        var result = importService.importFromFolder(folderName);
        return ResponseEntity.ok(Map.of(
                "packId", result.packId(),
                "questionsImported", result.questionsImported(),
                "message", "Imported " + result.questionsImported() + " questions from " + folderName));
    }

    @PostMapping("/neet")
    public ResponseEntity<?> importNeet(
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey)
            throws IOException {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        var result = importService.importNeetFolders();
        return ResponseEntity.ok(Map.of(
                "packsProcessed", result.packsProcessed(),
                "questionsImported", result.questionsImported(),
                "packIds",
                result.details().stream().map(ManifestImportService.ImportResult::packId).toList(),
                "message",
                "Imported " + result.questionsImported() + " NEET questions across "
                        + result.packsProcessed() + " pack(s)"));
    }

    @PostMapping("/all")
    public ResponseEntity<?> importAll(
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey)
            throws IOException {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        var result = importService.importAllPublishedFolders();
        return ResponseEntity.ok(Map.of(
                "packsProcessed", result.packsProcessed(),
                "questionsImported", result.questionsImported(),
                "details", result.details()));
    }
}
