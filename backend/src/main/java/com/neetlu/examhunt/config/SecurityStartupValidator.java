package com.neetlu.examhunt.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class SecurityStartupValidator {

    private static final Logger log = LoggerFactory.getLogger(SecurityStartupValidator.class);
    private static final String WEAK_JWT_DEFAULT = "exam-hunt-dev-jwt-secret-change-in-prod-32b";

    private final AppProperties appProperties;

    public SecurityStartupValidator(AppProperties props) {
        this.appProperties = props;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void validateProductionSecrets() {
        if (DeploymentMode.isLocalDevelopment(appProperties)) {
            log.debug("Local development mode — skipping production secret validation");
            return;
        }
        String secret = appProperties.jwtSecret();
        if (secret == null
                || secret.isBlank()
                || WEAK_JWT_DEFAULT.equals(secret)
                || secret.length() < 32) {
            throw new IllegalStateException(
                    "JWT_SECRET must be set to a random value with at least 32 characters in production");
        }
        log.info("Security startup checks passed");
    }
}
