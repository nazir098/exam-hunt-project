package com.neetlu.examhunt.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Allows scripted admin calls via {@code X-Admin-Key} when configured. Runs before JWT so a
 * Bearer token takes precedence when both are sent.
 */
@Component
public class AdminKeyAuthFilter extends OncePerRequestFilter {

    private static final String ADMIN_KEY_HEADER = "X-Admin-Key";
    private static final String LEGACY_PRINCIPAL = "legacy-admin-key";

    private final AdminAuthorization adminAuthorization;

    public AdminKeyAuthFilter(AdminAuthorization adminAuthorization) {
        this.adminAuthorization = adminAuthorization;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getServletPath().startsWith("/api/admin/");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (SecurityContextHolder.getContext().getAuthentication() == null
                && adminAuthorization.acceptsLegacyAdminKey(request.getHeader(ADMIN_KEY_HEADER))) {
            var authority = new SimpleGrantedAuthority("ROLE_ADMIN");
            var auth = new UsernamePasswordAuthenticationToken(LEGACY_PRINCIPAL, null, List.of(authority));
            SecurityContextHolder.getContext().setAuthentication(auth);
        }
        chain.doFilter(request, response);
    }
}
