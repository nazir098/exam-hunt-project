package com.neetlu.examhunt.web;

import com.neetlu.examhunt.security.AdminAuthorization;
import com.neetlu.examhunt.service.LeaderboardDemoSeedService;
import com.neetlu.examhunt.service.MockSeedService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/seed")
public class AdminSeedController {

    private final MockSeedService mockSeedService;
    private final LeaderboardDemoSeedService leaderboardDemoSeedService;
    private final AdminAuthorization adminAuthorization;

    public AdminSeedController(
            MockSeedService mockSeedService,
            LeaderboardDemoSeedService leaderboardDemoSeedService,
            AdminAuthorization adminAuthorization) {
        this.mockSeedService = mockSeedService;
        this.leaderboardDemoSeedService = leaderboardDemoSeedService;
        this.adminAuthorization = adminAuthorization;
    }

    @PostMapping("/demo")
    public ResponseEntity<?> seedDemo(
            @RequestParam(defaultValue = "false") boolean force,
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey) {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        var result = mockSeedService.seedDemoPacks(force);
        return ResponseEntity.ok(Map.of(
                "packsCreated", result.packsCreated(),
                "questionsCreated", result.questionsCreated(),
                "details", result.details(),
                "message", "Use POST /api/admin/import/neet for NEET question data"));
    }

    @PostMapping("/leaderboard-demo")
    public ResponseEntity<?> seedLeaderboardDemo(
            @RequestParam(defaultValue = "false") boolean force,
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey) {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        var result = leaderboardDemoSeedService.seed(force);
        return ResponseEntity.ok(Map.of(
                "usersCreated", result.usersCreated(),
                "attemptsCreated", result.attemptsCreated(),
                "details", result.details()));
    }

    @PostMapping("/cleanup-leaderboard-demo")
    public ResponseEntity<?> cleanupLeaderboardDemo(
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey) {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        var result = leaderboardDemoSeedService.cleanup();
        return ResponseEntity.ok(Map.of(
                "usersRemoved", result.usersRemoved(),
                "attemptsRemoved", result.attemptsRemoved()));
    }

    @PostMapping("/cleanup-demo")
    public ResponseEntity<?> cleanupDemo(
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey) {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        var result = mockSeedService.cleanupDemoPacks();
        return ResponseEntity.ok(Map.of(
                "packsRemoved", result.packsRemoved(),
                "packIds", result.packIds(),
                "message",
                result.packsRemoved() > 0 ? "Removed demo packs" : "No demo packs found"));
    }
}
