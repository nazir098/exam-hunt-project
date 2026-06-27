package com.neetlu.examhunt.service;

import com.neetlu.examhunt.config.AppProperties;
import com.neetlu.examhunt.model.UserAccount;
import com.neetlu.examhunt.model.UserRole;
import com.neetlu.examhunt.repository.UserAccountRepository;
import com.neetlu.examhunt.security.AdminAuthorization;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final UserAccountRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AdminAuthorization adminAuthorization;
    private final GoogleIdTokenVerifier googleIdTokenVerifier;
    private final AppProperties appProperties;

    public AuthService(
            UserAccountRepository users,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            AdminAuthorization adminAuthorization,
            GoogleIdTokenVerifier googleIdTokenVerifier,
            AppProperties appProperties) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.adminAuthorization = adminAuthorization;
        this.googleIdTokenVerifier = googleIdTokenVerifier;
        this.appProperties = appProperties;
    }

    public AuthResult register(String email, String password, String displayName) {
        String normalized = normalizeEmail(email);
        if (adminAuthorization.isAdminEmail(normalized)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Use sign in for the administrator account");
        }
        if (users.existsByEmailIgnoreCase(normalized)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }
        if (password == null || password.length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 8 characters");
        }
        UserAccount user = new UserAccount();
        user.setEmail(normalized);
        user.setDisplayName(displayName != null && !displayName.isBlank() ? displayName.trim() : nameFromEmail(normalized));
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole(UserRole.USER);
        user = users.save(user);
        return tokenFor(user);
    }

    public AuthResult login(String email, String password) {
        UserAccount user = users.findByEmailIgnoreCase(normalizeEmail(email))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        if (user.getPasswordHash() == null
                || user.getPasswordHash().isBlank()
                || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        syncAndSaveRole(user);
        return tokenFor(user);
    }

    public GoogleAuthStatus googleAuthStatus() {
        boolean enabled = appProperties.googleAuthEnabled()
                && appProperties.googleClientId() != null
                && !appProperties.googleClientId().isBlank();
        return new GoogleAuthStatus(enabled, enabled ? appProperties.googleClientId().trim() : "");
    }

    public AuthResult loginWithGoogle(String credential) {
        GoogleIdTokenVerifier.GoogleProfile profile = googleIdTokenVerifier.verify(credential);
        UserAccount byGoogle = users.findByGoogleSub(profile.sub()).orElse(null);
        if (byGoogle != null) {
            syncAndSaveRole(byGoogle);
            return tokenFor(byGoogle);
        }

        UserAccount byEmail = users.findByEmailIgnoreCase(profile.email()).orElse(null);
        if (byEmail != null) {
            if (byEmail.getGoogleSub() != null && !byEmail.getGoogleSub().equals(profile.sub())) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT, "This email is linked to a different Google account");
            }
            if (byEmail.getGoogleSub() == null) {
                byEmail.setGoogleSub(profile.sub());
            }
            if (profile.displayName() != null
                    && !profile.displayName().isBlank()
                    && (byEmail.getDisplayName() == null || byEmail.getDisplayName().isBlank())) {
                byEmail.setDisplayName(profile.displayName());
            }
            syncAndSaveRole(byEmail);
            users.save(byEmail);
            return tokenFor(byEmail);
        }

        if (adminAuthorization.isAdminEmail(profile.email())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Use sign in for the administrator account");
        }

        UserAccount user = new UserAccount();
        user.setEmail(profile.email());
        user.setGoogleSub(profile.sub());
        user.setDisplayName(
                profile.displayName() != null && !profile.displayName().isBlank()
                        ? profile.displayName()
                        : nameFromEmail(profile.email()));
        user.setRole(UserRole.USER);
        user = users.save(user);
        return tokenFor(user);
    }

    public UserAccount requireUser(String userId) {
        UserAccount user = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        syncAndSaveRole(user);
        return user;
    }

    public UserProfile profileFor(UserAccount user) {
        return new UserProfile(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                adminAuthorization.isAdmin(user));
    }

    private void syncAndSaveRole(UserAccount user) {
        UserRole expected = adminAuthorization.roleFor(user);
        if (user.getRole() != expected) {
            user.setRole(expected);
            users.save(user);
        }
    }

    private AuthResult tokenFor(UserAccount user) {
        String token = jwtService.createToken(user.getId(), user.getEmail(), user.getRole());
        return new AuthResult(token, profileFor(user));
    }

    private static String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }
        return email.trim().toLowerCase();
    }

    private static String nameFromEmail(String email) {
        int at = email.indexOf('@');
        return at > 0 ? email.substring(0, at) : email;
    }

    public record AuthResult(String token, UserProfile user) {}

    public record UserProfile(String id, String email, String displayName, boolean admin) {}

    public record GoogleAuthStatus(boolean enabled, String clientId) {}
}
