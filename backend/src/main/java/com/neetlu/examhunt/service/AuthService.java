package com.neetlu.examhunt.service;

import com.neetlu.examhunt.model.UserAccount;
import com.neetlu.examhunt.repository.UserAccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final UserAccountRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
            UserAccountRepository users,
            PasswordEncoder passwordEncoder,
            JwtService jwtService) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthResult register(String email, String password, String displayName) {
        String normalized = normalizeEmail(email);
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
        user = users.save(user);
        return tokenFor(user);
    }

    public AuthResult login(String email, String password) {
        UserAccount user = users.findByEmailIgnoreCase(normalizeEmail(email))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        return tokenFor(user);
    }

    public UserAccount requireUser(String userId) {
        return users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private AuthResult tokenFor(UserAccount user) {
        String token = jwtService.createToken(user.getId(), user.getEmail());
        return new AuthResult(
                token,
                new UserProfile(user.getId(), user.getEmail(), user.getDisplayName()));
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

    public record UserProfile(String id, String email, String displayName) {}
}
