package com.neetlu.examhunt.web;

import com.neetlu.examhunt.security.AdminAuthorization;
import com.neetlu.examhunt.service.ImportJobService;
import com.neetlu.examhunt.service.ManifestImportService;
import org.springframework.http.HttpStatus;
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
    private final ImportJobService importJobService;
    private final AdminAuthorization adminAuthorization;

    public AdminImportController(
            ManifestImportService importService,
            ImportJobService importJobService,
            AdminAuthorization adminAuthorization) {
        this.importService = importService;
        this.importJobService = importJobService;
        this.adminAuthorization = adminAuthorization;
    }

    @GetMapping("/folders")
    public ResponseEntity<?> listFolders(
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey)
            throws IOException {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        var folders = importService.listImportableFolders();
        return ResponseEntity.ok(Map.of(
                "folders", folders,
                "count", folders.size(),
                "source", importService.importSourceStatus()));
    }

    @GetMapping("/jobs")
    public ResponseEntity<?> listJobs(
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey) {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        var jobs = importJobService.listRecentJobs();
        return ResponseEntity.ok(Map.of("jobs", jobs, "count", jobs.size()));
    }

    @GetMapping("/jobs/{jobId}")
    public ResponseEntity<?> getJob(
            @PathVariable String jobId,
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey) {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        return ResponseEntity.ok(importJobService.getJob(jobId));
    }

    @PostMapping("/folder/{folderName}")
    public ResponseEntity<?> importFolder(
            @PathVariable String folderName,
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey) {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        var job = importJobService.startFolderImport(folderName);
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(Map.of(
                        "jobId", job.jobId(),
                        "status", job.status(),
                        "message", "Import started for folder " + folderName + ". Poll /api/admin/import/jobs/"
                                + job.jobId()));
    }

    @PostMapping("/neet")
    public ResponseEntity<?> importNeet(
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey) {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        var job = importJobService.startNeetImport();
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(Map.of(
                        "jobId", job.jobId(),
                        "status", job.status(),
                        "message",
                        "NEET import started. Poll /api/admin/import/jobs/" + job.jobId()));
    }

    @PostMapping("/all")
    public ResponseEntity<?> importAll(
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey) {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        var job = importJobService.startAllImport();
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(Map.of(
                        "jobId", job.jobId(),
                        "status", job.status(),
                        "message",
                        "Full import started. Poll /api/admin/import/jobs/" + job.jobId()));
    }
}
