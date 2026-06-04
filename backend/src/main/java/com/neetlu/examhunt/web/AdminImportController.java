package com.neetlu.examhunt.web;

import com.neetlu.examhunt.config.AppProperties;
import com.neetlu.examhunt.service.ManifestImportService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/import")
public class AdminImportController {

    private final ManifestImportService importService;
    private final AppProperties appProperties;

    public AdminImportController(ManifestImportService importService, AppProperties appProperties) {
        this.importService = importService;
        this.appProperties = appProperties;
    }

    @PostMapping("/folder/{folderName}")
    public ResponseEntity<?> importFolder(
            @PathVariable String folderName,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey
    ) throws IOException {
        checkAdminKey(adminKey);
        var result = importService.importFromFolder(folderName);
        return ResponseEntity.ok(Map.of(
                "packId", result.packId(),
                "questionsImported", result.questionsImported(),
                "message", "Imported " + result.questionsImported() + " questions from " + folderName
        ));
    }

    @PostMapping("/all")
    public ResponseEntity<?> importAll(
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey
    ) throws IOException {
        checkAdminKey(adminKey);
        var result = importService.importAllPublishedFolders();
        return ResponseEntity.ok(Map.of(
                "packsProcessed", result.packsProcessed(),
                "questionsImported", result.questionsImported(),
                "details", result.details()
        ));
    }

    private void checkAdminKey(String provided) {
        String expected = appProperties.adminImportKey();
        if (expected != null && !expected.isBlank()) {
            if (provided == null || !expected.equals(provided)) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid admin key");
            }
        }
    }
}
