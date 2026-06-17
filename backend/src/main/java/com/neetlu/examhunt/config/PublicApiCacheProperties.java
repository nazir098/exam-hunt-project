package com.neetlu.examhunt.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** HTTP + in-process TTL for public catalog GET APIs (Cloudflare edge cache). */
@ConfigurationProperties(prefix = "app.public-api-cache")
public record PublicApiCacheProperties(
        /** Browser max-age (seconds). */
        int maxAgeSeconds,
        /** CDN / shared cache max-age (seconds), e.g. Cloudflare s-maxage. */
        int sMaxAgeSeconds,
        /** stale-while-revalidate for browsers and CDNs (seconds). */
        int staleWhileRevalidateSeconds,
        /** In-process Mongo result cache TTL (seconds); cleared on pack import. */
        int memoryTtlSeconds
) {
    public PublicApiCacheProperties {
        if (maxAgeSeconds <= 0) {
            maxAgeSeconds = 60;
        }
        if (sMaxAgeSeconds <= 0) {
            sMaxAgeSeconds = 300;
        }
        if (staleWhileRevalidateSeconds < 0) {
            staleWhileRevalidateSeconds = 60;
        }
        if (memoryTtlSeconds <= 0) {
            memoryTtlSeconds = 120;
        }
    }
}
