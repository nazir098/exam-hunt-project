package com.neetlu.examhunt.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String corsOrigins,
        String extractorRoot,
        /** pdf-qa-extractor src/ path for Python metadata refresh (EXTRACTOR_SOURCE_ROOT) */
        String extractorSourceRoot,
        String extractorManifestBaseUrl,
        String publicFilesBaseUrl,
        /** Comma-separated year folders on remote storage, e.g. 2016,2025 */
        String importPackFolders,
        String adminImportKey,
        String adminEmail,
        String adminBootstrapPassword,
        String jwtSecret,
        long jwtExpirationHours,
        boolean leaderboardDemoSeed,
        String llmApiKey,
        String llmBaseUrl,
        String llmModel,
        boolean aiPracticeEnabled,
        boolean googleAuthEnabled,
        String googleClientId
) {}
