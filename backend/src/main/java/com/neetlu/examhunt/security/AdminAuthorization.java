package com.neetlu.examhunt.security;

import com.neetlu.examhunt.config.AppProperties;
import com.neetlu.examhunt.model.UserAccount;
import com.neetlu.examhunt.model.UserRole;
import com.neetlu.examhunt.repository.UserAccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class AdminAuthorization {

    private final AppProperties appProperties;
    private final UserAccountRepository users;

    public AdminAuthorization(AppProperties appProperties, UserAccountRepository users) {
        this.appProperties = appProperties;
        this.users = users;
    }

    public boolean isAdminEmail(String email) {
        String configured = appProperties.adminEmail();
        if (configured == null || configured.isBlank() || email == null) {
            return false;
        }
        return normalizeEmail(email).equals(normalizeEmail(configured));
    }

    public boolean isAdmin(UserAccount user) {
        return user != null
                && user.getRole() == UserRole.ADMIN
                && isAdminEmail(user.getEmail());
    }

    public UserRole roleFor(UserAccount user) {
        return isAdminEmail(user.getEmail()) ? UserRole.ADMIN : UserRole.USER;
    }

    public void applyRole(UserAccount user) {
        user.setRole(roleFor(user));
    }

    public void requireAdminAccess(String userId, String adminKey) {
        if (isValidLegacyAdminKey(adminKey)) {
            return;
        }
        if (userId == null || userId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in as admin to continue");
        }
        UserAccount user = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        if (!isAdmin(user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
    }

    public void demoteNonConfiguredAdmins() {
        String configured = appProperties.adminEmail();
        if (configured == null || configured.isBlank()) {
            return;
        }
        String adminEmail = normalizeEmail(configured);
        for (UserAccount account : users.findByRole(UserRole.ADMIN)) {
            if (!normalizeEmail(account.getEmail()).equals(adminEmail)) {
                account.setRole(UserRole.USER);
                users.save(account);
            }
        }
    }

    public boolean acceptsLegacyAdminKey(String provided) {
        return isValidLegacyAdminKey(provided);
    }

    private boolean isValidLegacyAdminKey(String provided) {
        String expected = appProperties.adminImportKey();
        return expected != null && !expected.isBlank() && expected.equals(provided);
    }

    public static String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }
}
