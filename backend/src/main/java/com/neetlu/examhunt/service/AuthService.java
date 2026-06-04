package com.neetlu.examhunt.service;

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

    public AuthService(
            UserAccountRepository users,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            AdminAuthorization adminAuthorization) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.adminAuthorization = adminAuthorization;
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
        if (password == null || password.length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 6 characters");
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
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        syncAndSaveRole(user);
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
}
