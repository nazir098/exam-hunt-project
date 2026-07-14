package com.neetlu.examhunt.web;

import com.neetlu.examhunt.security.AdminAuthorization;
import com.neetlu.examhunt.service.QuestionMetadataStore;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerMapping;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Serves local EXTRACTOR_ROOT/output files for admin preview (e.g. newly cropped diagrams before R2
 * sync). Never used for student/Mongo URLs.
 */
@RestController
@RequestMapping("/api/admin/extractor-files")
public class AdminExtractorFilesController {

    private final QuestionMetadataStore metadataStore;
    private final AdminAuthorization adminAuthorization;

    public AdminExtractorFilesController(
            QuestionMetadataStore metadataStore, AdminAuthorization adminAuthorization) {
        this.metadataStore = metadataStore;
        this.adminAuthorization = adminAuthorization;
    }

    @GetMapping("/{folder}/**")
    public ResponseEntity<Resource> get(
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey,
            @PathVariable String folder,
            HttpServletRequest request) {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        String fullPath =
                (String) request.getAttribute(HandlerMapping.PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE);
        String prefix = "/api/admin/extractor-files/" + folder + "/";
        if (fullPath == null || !fullPath.startsWith(prefix)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found");
        }
        String relative = fullPath.substring(prefix.length());
        while (relative.startsWith("/")) {
            relative = relative.substring(1);
        }
        if (relative.isBlank() || relative.contains("..")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid path");
        }
        Path root;
        try {
            root = metadataStore.outputRootOrThrow().resolve(folder).normalize();
        } catch (IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
        Path file = root.resolve(relative).normalize();
        if (!file.startsWith(root) || !Files.isRegularFile(file)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found");
        }
        String contentType = probeContentType(file);
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=30")
                .contentType(MediaType.parseMediaType(contentType))
                .body(new FileSystemResource(file));
    }

    private static String probeContentType(Path file) {
        try {
            String probed = Files.probeContentType(file);
            if (probed != null && !probed.isBlank()) {
                return probed;
            }
        } catch (IOException ignored) {
            // fall through
        }
        String name = file.getFileName().toString().toLowerCase(Locale.ROOT);
        if (name.endsWith(".webp")) return "image/webp";
        if (name.endsWith(".png")) return "image/png";
        if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
        if (name.endsWith(".svg")) return "image/svg+xml";
        return "application/octet-stream";
    }
}
