package com.neetlu.examhunt.security;

import com.neetlu.examhunt.config.AppProperties;
import com.neetlu.examhunt.config.DeploymentMode;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

/** Simple in-memory rate limits to slow scraping and credential stuffing. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Duration AUTH_WINDOW = Duration.ofMinutes(1);
    private static final int AUTH_MAX = 20;
    private static final Duration REGISTER_WINDOW = Duration.ofHours(1);
    private static final int REGISTER_MAX = 10;
    private static final Duration CATALOG_WINDOW = Duration.ofMinutes(1);
    private static final int CATALOG_MAX = 120;
    private static final Duration ANALYTICS_WINDOW = Duration.ofMinutes(1);
    private static final int ANALYTICS_MAX = 90;
    private static final Duration AI_WINDOW = Duration.ofMinutes(1);
    private static final int AI_MAX = 30;

    private final Map<String, Deque<Long>> buckets = new ConcurrentHashMap<>();
    private final AppProperties appProperties;

    public RateLimitFilter(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (DeploymentMode.isLocalDevelopment(appProperties)) {
            chain.doFilter(request, response);
            return;
        }
        String path = request.getServletPath();
        String method = request.getMethod();
        String clientKey = clientKey(request);

        RateRule rule = ruleFor(method, path);
        if (rule != null && !allow(clientKey + ":" + rule.name(), rule.max(), rule.window())) {
            response.setStatus(429);
            response.setHeader("Retry-After", String.valueOf(rule.window().toSeconds()));
            response.setContentType("text/plain");
            response.getWriter().write("Too many requests. Please try again later.");
            return;
        }
        chain.doFilter(request, response);
    }

    private static RateRule ruleFor(String method, String path) {
        if (HttpMethod.POST.matches(method) && "/api/auth/login".equals(path)) {
            return new RateRule("auth-login", AUTH_MAX, AUTH_WINDOW);
        }
        if (HttpMethod.POST.matches(method) && "/api/auth/google".equals(path)) {
            return new RateRule("auth-google", AUTH_MAX, AUTH_WINDOW);
        }
        if (HttpMethod.POST.matches(method) && "/api/auth/register".equals(path)) {
            return new RateRule("auth-register", REGISTER_MAX, REGISTER_WINDOW);
        }
        if (HttpMethod.POST.matches(method) && "/api/analytics/events".equals(path)) {
            return new RateRule("analytics", ANALYTICS_MAX, ANALYTICS_WINDOW);
        }
        if (HttpMethod.POST.matches(method) && "/api/practice-ai/assist".equals(path)) {
            return new RateRule("practice-ai", AI_MAX, AI_WINDOW);
        }
        if (HttpMethod.GET.matches(method) && ("/api/questions".equals(path)
                || path.startsWith("/api/questions/"))) {
            return new RateRule("questions", CATALOG_MAX, CATALOG_WINDOW);
        }
        return null;
    }

    private boolean allow(String key, int maxRequests, Duration window) {
        long now = System.currentTimeMillis();
        long windowMs = window.toMillis();
        Deque<Long> timestamps = buckets.computeIfAbsent(key, ignored -> new ConcurrentLinkedDeque<>());
        synchronized (timestamps) {
            while (!timestamps.isEmpty() && timestamps.peekFirst() < now - windowMs) {
                timestamps.pollFirst();
            }
            if (timestamps.size() >= maxRequests) {
                return false;
            }
            timestamps.addLast(now);
            return true;
        }
    }

    private static String clientKey(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            int comma = forwarded.indexOf(',');
            return comma > 0 ? forwarded.substring(0, comma).trim() : forwarded.trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }

    private record RateRule(String name, int max, Duration window) {}
}
