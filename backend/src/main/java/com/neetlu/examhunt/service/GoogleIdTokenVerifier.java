package com.neetlu.examhunt.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.neetlu.examhunt.config.AppProperties;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@Service
public class GoogleIdTokenVerifier {

    private final AppProperties appProperties;
    private final RestClient restClient;

    public GoogleIdTokenVerifier(AppProperties appProperties) {
        this.appProperties = appProperties;
        this.restClient = RestClient.create();
    }

    public GoogleProfile verify(String idToken) {
        if (!appProperties.googleAuthEnabled()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Google sign-in is not enabled");
        }
        String clientId = appProperties.googleClientId();
        if (clientId == null || clientId.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE, "Google sign-in is not configured");
        }
        if (idToken == null || idToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Google credential is required");
        }

        TokenInfoResponse info;
        try {
            info = restClient
                    .get()
                    .uri("https://oauth2.googleapis.com/tokeninfo?id_token={token}", idToken.trim())
                    .retrieve()
                    .body(TokenInfoResponse.class);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Google sign-in");
        }
        if (info == null || info.sub() == null || info.sub().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Google sign-in");
        }
        if (!clientId.equals(info.aud())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Google sign-in audience");
        }
        if (!"true".equalsIgnoreCase(info.emailVerified())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Google email is not verified");
        }
        if (info.email() == null || info.email().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Google account has no email");
        }
        return new GoogleProfile(
                info.sub().trim(),
                info.email().trim().toLowerCase(),
                info.name() != null && !info.name().isBlank() ? info.name().trim() : null);
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record TokenInfoResponse(
            String aud,
            String sub,
            String email,
            @JsonProperty("email_verified") String emailVerified,
            String name) {}

    public record GoogleProfile(String sub, String email, String displayName) {}
}
