package com.neetlu.examhunt.config;

import com.neetlu.examhunt.service.LeaderboardDemoSeedService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class LeaderboardDemoInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(LeaderboardDemoInitializer.class);

    private final LeaderboardDemoSeedService demoSeedService;
    private final AppProperties appProperties;

    public LeaderboardDemoInitializer(LeaderboardDemoSeedService demoSeedService, AppProperties appProperties) {
        this.demoSeedService = demoSeedService;
        this.appProperties = appProperties;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!appProperties.leaderboardDemoSeed()) {
            return;
        }
        if (demoSeedService.hasDemoData()) {
            return;
        }
        var result = demoSeedService.seed(false);
        log.info(
                "Seeded leaderboard demo: {} users, {} attempts",
                result.usersCreated(),
                result.attemptsCreated());
    }
}
