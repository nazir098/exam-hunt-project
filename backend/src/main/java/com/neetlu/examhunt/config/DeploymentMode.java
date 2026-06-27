package com.neetlu.examhunt.config;

/**
 * Distinguishes local development from production deploys.
 * Local: admin bootstrap may reset password; rate limits off; weak JWT allowed.
 * Production: strong secrets required; admin password set only on first create.
 */
public final class DeploymentMode {

    private DeploymentMode() {}

    public static boolean isLocalDevelopment(AppProperties props) {
        String flag = System.getenv("APP_DEV_MODE");
        if ("true".equalsIgnoreCase(flag)) {
            return true;
        }
        if ("false".equalsIgnoreCase(flag)) {
            return false;
        }
        if ("true".equalsIgnoreCase(System.getenv("REQUIRE_SECURE_SECRETS"))) {
            return false;
        }
        String cors = props.corsOrigins();
        return cors == null || !cors.contains("https://");
    }
}
