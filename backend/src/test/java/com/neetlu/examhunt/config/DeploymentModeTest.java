package com.neetlu.examhunt.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DeploymentModeTest {

    @Test
    void treatsLocalhostCorsAsDevelopment() {
        AppProperties props = propsWithCors("http://localhost:5173,http://127.0.0.1:5173");
        assertThat(DeploymentMode.isLocalDevelopment(props)).isTrue();
    }

    @Test
    void treatsHttpsCorsAsProduction() {
        AppProperties props = propsWithCors("https://www.techmuzzle.in,http://localhost:5173");
        assertThat(DeploymentMode.isLocalDevelopment(props)).isFalse();
    }

    private static AppProperties propsWithCors(String cors) {
        return new AppProperties(
                cors,
                "",
                "",
                "",
                "",
                "",
                "admin@example.com",
                "",
                "exam-hunt-dev-jwt-secret-change-in-prod-32b",
                168L,
                true,
                "",
                "http://localhost:3001/v1",
                "auto",
                true,
                false,
                "");
    }
}
