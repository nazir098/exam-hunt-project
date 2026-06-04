package com.neetlu.examhunt.web;

import com.neetlu.examhunt.config.AppProperties;
import com.neetlu.examhunt.service.LeaderboardDemoSeedService;
import com.neetlu.examhunt.service.MockSeedService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/seed")
public class AdminSeedController {

    private final MockSeedService mockSeedService;
    private final LeaderboardDemoSeedService leaderboardDemoSeedService;
    private final AppProperties appProperties;

    public AdminSeedController(
            MockSeedService mockSeedService,
            LeaderboardDemoSeedService leaderboardDemoSeedService,
            AppProperties appProperties) {
        this.mockSeedService = mockSeedService;
        this.leaderboardDemoSeedService = leaderboardDemoSeedService;
        this.appProperties = appProperties;
    }

    @PostMapping("/demo")
    public ResponseEntity<?> seedDemo(
            @RequestParam(defaultValue = "false") boolean force,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey
    ) {
        checkAdminKey(adminKey);
        var result = mockSeedService.seedDemoPacks(force);
        return ResponseEntity.ok(Map.of(
                "packsCreated", result.packsCreated(),
                "questionsCreated", result.questionsCreated(),
                "details", result.details(),
                "message", "Use POST /api/admin/import/neet for NEET question data"
        ));
    }

    @PostMapping("/leaderboard-demo")
    public ResponseEntity<?> seedLeaderboardDemo(
            @RequestParam(defaultValue = "false") boolean force,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey) {
        checkAdminKey(adminKey);
        var result = leaderboardDemoSeedService.seed(force);
        return ResponseEntity.ok(Map.of(
                "usersCreated", result.usersCreated(),
                "attemptsCreated", result.attemptsCreated(),
                "details", result.details()));
    }

    @PostMapping("/cleanup-leaderboard-demo")
    public ResponseEntity<?> cleanupLeaderboardDemo(
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey) {
        checkAdminKey(adminKey);
        var result = leaderboardDemoSeedService.cleanup();
        return ResponseEntity.ok(Map.of(
                "usersRemoved", result.usersRemoved(),
                "attemptsRemoved", result.attemptsRemoved()));
    }

    @PostMapping("/cleanup-demo")
    public ResponseEntity<?> cleanupDemo(
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey
    ) {
        checkAdminKey(adminKey);
        var result = mockSeedService.cleanupDemoPacks();
        return ResponseEntity.ok(Map.of(
                "packsRemoved", result.packsRemoved(),
                "packIds", result.packIds(),
                "message", result.packsRemoved() > 0
                        ? "Removed demo packs"
                        : "No demo packs found"
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
