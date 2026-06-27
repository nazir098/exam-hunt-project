package com.neetlu.examhunt.config;

import org.springframework.web.cors.CorsConfiguration;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

final class CorsSupport {

    private static final List<String> DEV_ORIGIN_PATTERNS = List.of(
            "http://localhost:*",
            "http://127.0.0.1:*");

    private static final List<String> DEV_ORIGINS = List.of(
            "http://localhost:5173",
            "http://127.0.0.1:5173");

    private CorsSupport() {}

    static void apply(CorsConfiguration config, AppProperties props) {
        Set<String> origins = new LinkedHashSet<>(DEV_ORIGINS);
        String configured = props.corsOrigins() != null ? props.corsOrigins() : "";
        Arrays.stream(configured.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .forEach(origins::add);
        origins.forEach(config::addAllowedOrigin);
        boolean productionOrigins =
                origins.stream().anyMatch(origin -> origin.startsWith("https://"));
        if (!productionOrigins) {
            DEV_ORIGIN_PATTERNS.forEach(config::addAllowedOriginPattern);
        }
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of(
                "Authorization",
                "Content-Type",
                "Accept",
                "X-Admin-Key",
                "X-Requested-With"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);
    }
}
