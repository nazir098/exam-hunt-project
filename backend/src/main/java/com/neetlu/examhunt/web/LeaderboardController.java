package com.neetlu.examhunt.web;

import com.neetlu.examhunt.service.LeaderboardService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/leaderboard")
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    public LeaderboardController(LeaderboardService leaderboardService) {
        this.leaderboardService = leaderboardService;
    }

    @GetMapping
    public LeaderboardService.LeaderboardResponse leaderboard(
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "weekly") String period,
            @AuthenticationPrincipal String userId) {
        return leaderboardService.leaderboard(limit, period, userId);
    }
}
