package com.neetlu.examhunt.config;

import org.junit.jupiter.api.Test;
import org.springframework.web.cors.CorsConfiguration;

import static org.assertj.core.api.Assertions.assertThat;

class CorsSupportTest {

    @Test
    void applyAllowsProductionOriginsWithoutWildcardWhenCredentialsAreEnabled() {
        AppProperties props = new AppProperties(
                "https://www.techmuzzle.in,https://exam-hunt-project.pages.dev",
                "",
                "",
                "",
                "",
                "admin@example.com",
                "",
                "test-secret-test-secret-test-secret-32b",
                "secrect",
                168L,
                false,
                "freellmapi-test",
                "https://freellmapi-t1pm.onrender.com/v1",
                "auto",
                true);
        CorsConfiguration config = new CorsConfiguration();

        CorsSupport.apply(config, props);

        assertThat(config.getAllowCredentials()).isTrue();
        assertThat(config.getAllowedOrigins())
                .contains("https://www.techmuzzle.in", "https://exam-hunt-project.pages.dev")
                .doesNotContain("*");
        assertThat(config.checkOrigin("https://www.techmuzzle.in")).isEqualTo("https://www.techmuzzle.in");
        assertThat(config.checkOrigin("https://exam-hunt-project.pages.dev"))
                .isEqualTo("https://exam-hunt-project.pages.dev");
    }

    @Test
    void applyKeepsLocalDevelopmentOriginsAndPatterns() {
        AppProperties props = new AppProperties(
                "",
                "",
                "",
                "",
                "",
                "admin@example.com",
                "",
                "test-secret-test-secret-test-secret-32b",
                "secret",
                168L,
                true,
                "",
                "http://localhost:3001/v1",
                "auto",
                true);
        CorsConfiguration config = new CorsConfiguration();

        CorsSupport.apply(config, props);

        assertThat(config.checkOrigin("http://localhost:5173")).isEqualTo("http://localhost:5173");
        assertThat(config.checkOrigin("http://127.0.0.1:4173")).isEqualTo("http://127.0.0.1:4173");
    }
}
