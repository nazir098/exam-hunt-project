package com.neetlu.examhunt.config;

import com.neetlu.examhunt.model.UserAccount;
import com.neetlu.examhunt.model.UserRole;
import com.neetlu.examhunt.repository.UserAccountRepository;
import com.neetlu.examhunt.security.AdminAuthorization;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminAccountBootstrap {

    private static final Logger log = LoggerFactory.getLogger(AdminAccountBootstrap.class);

    private final AppProperties appProperties;
    private final UserAccountRepository users;
    private final PasswordEncoder passwordEncoder;
    private final AdminAuthorization adminAuthorization;

    public AdminAccountBootstrap(
            AppProperties appProperties,
            UserAccountRepository users,
            PasswordEncoder passwordEncoder,
            AdminAuthorization adminAuthorization) {
        this.appProperties = appProperties;
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.adminAuthorization = adminAuthorization;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void ensureAdminAccount() {
        String email = appProperties.adminEmail();
        String password = appProperties.adminBootstrapPassword();
        if (email == null || email.isBlank()) {
            log.warn("ADMIN_EMAIL not set — no bootstrap admin account");
            return;
        }
        if (password == null || password.isBlank()) {
            log.warn("ADMIN_PASSWORD not set — admin account will not be created or updated");
            adminAuthorization.demoteNonConfiguredAdmins();
            return;
        }

        String normalized = AdminAuthorization.normalizeEmail(email);
        UserAccount admin = users.findByEmailIgnoreCase(normalized).orElseGet(UserAccount::new);
        admin.setEmail(normalized);
        admin.setRole(UserRole.ADMIN);
        admin.setPasswordHash(passwordEncoder.encode(password));
        if (admin.getDisplayName() == null || admin.getDisplayName().isBlank()) {
            admin.setDisplayName("Admin");
        }
        users.save(admin);
        adminAuthorization.demoteNonConfiguredAdmins();
        log.info("Admin account ready for {}", normalized);
    }
}
