package com.neetlu.examhunt.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String corsOrigins,
        String extractorRoot,
        String extractorManifestBaseUrl,
        String adminImportKey,
        String adminEmail,
        String adminBootstrapPassword,
        String jwtSecret,
        long jwtExpirationHours,
        boolean leaderboardDemoSeed,
        String llmApiKey,
        String llmBaseUrl,
        String llmModel,
        boolean aiPracticeEnabled
) {}
