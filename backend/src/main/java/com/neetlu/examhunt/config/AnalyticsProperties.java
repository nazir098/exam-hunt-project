package com.neetlu.examhunt.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.analytics")
public record AnalyticsProperties(boolean eventsEnabled) {}
