package com.neetlu.examhunt.security;

import com.neetlu.examhunt.model.UserAccount;
import com.neetlu.examhunt.model.UserRole;
import com.neetlu.examhunt.repository.UserAccountRepository;
import com.neetlu.examhunt.security.AdminAuthorization;
import com.neetlu.examhunt.service.JwtService;
import io.jsonwebtoken.JwtException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

import java.util.Optional;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserAccountRepository users;
    private final AdminAuthorization adminAuthorization;

    public JwtAuthFilter(
            JwtService jwtService, UserAccountRepository users, AdminAuthorization adminAuthorization) {
        this.jwtService = jwtService;
        this.users = users;
        this.adminAuthorization = adminAuthorization;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return path.equals("/api/auth/register")
                || path.equals("/api/auth/login")
                || path.equals("/api/auth/google")
                || request.getMethod().equalsIgnoreCase("OPTIONS");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                String userId = jwtService.userIdFromToken(token);
                Optional<UserAccount> account = users.findById(userId);
                if (account.isEmpty()) {
                    SecurityContextHolder.clearContext();
                    chain.doFilter(request, response);
                    return;
                }
                UserRole role = adminAuthorization.roleFor(account.get());
                var authority = new SimpleGrantedAuthority("ROLE_" + role.name());
                var auth = new UsernamePasswordAuthenticationToken(userId, null, List.of(authority));
                auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (JwtException ignored) {
                SecurityContextHolder.clearContext();
            }
        }
        chain.doFilter(request, response);
    }
}
