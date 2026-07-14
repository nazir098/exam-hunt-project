package com.neetlu.examhunt.web;

import com.neetlu.examhunt.service.QuestionMetadataStore;
import jakarta.servlet.http.HttpServletRequest;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerMapping;

/**
 * Serves EXTRACTOR_ROOT pack files for student/admin UIs when local crops are newer than R2.
 * Only available when EXTRACTOR_ROOT is mounted; path traversal is rejected.
 */
@RestController
@RequestMapping("/api/local-files")
public class LocalExtractorFilesController {

    private final QuestionMetadataStore metadataStore;

    public LocalExtractorFilesController(QuestionMetadataStore metadataStore) {
        this.metadataStore = metadataStore;
    }

    @GetMapping("/{folder}/**")
    public ResponseEntity<Resource> get(@PathVariable String folder, HttpServletRequest request) {
        String fullPath =
                (String) request.getAttribute(HandlerMapping.PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE);
        String prefix = "/api/local-files/" + folder + "/";
        if (fullPath == null || !fullPath.startsWith(prefix)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found");
        }
        String relative = fullPath.substring(prefix.length());
        while (relative.startsWith("/")) {
            relative = relative.substring(1);
        }
        // Drop query string if somehow included in path attribute.
        int q = relative.indexOf('?');
        if (q >= 0) {
            relative = relative.substring(0, q);
        }
        if (relative.isBlank() || relative.contains("..")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid path");
        }
        Path root;
        try {
            root = metadataStore.outputRootOrThrow().resolve(folder).normalize();
        } catch (IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Local extractor files unavailable");
        }
        Path file = root.resolve(relative).normalize();
        if (!file.startsWith(root) || !Files.isRegularFile(file)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found");
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=30")
                .contentType(MediaType.parseMediaType(probeContentType(file)))
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
