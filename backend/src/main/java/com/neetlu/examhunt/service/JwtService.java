package com.neetlu.examhunt.service;

import com.neetlu.examhunt.config.AppProperties;
import com.neetlu.examhunt.model.UserRole;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationHours;

    public JwtService(AppProperties props) {
        this.key = Keys.hmacShaKeyFor(props.jwtSecret().getBytes(StandardCharsets.UTF_8));
        this.expirationHours = props.jwtExpirationHours();
    }

    public String createToken(String userId, String email, UserRole role) {
        Instant now = Instant.now();
        UserRole effective = role == null ? UserRole.USER : role;
        return Jwts.builder()
                .subject(userId)
                .claim("email", email)
                .claim("role", effective.name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(expirationHours * 3600)))
                .signWith(key)
                .compact();
    }

    public UserRole roleFromToken(String token) {
        String raw = parse(token).get("role", String.class);
        if (raw == null) {
            return UserRole.USER;
        }
        try {
            return UserRole.valueOf(raw);
        } catch (IllegalArgumentException ex) {
            return UserRole.USER;
        }
    }

    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String userIdFromToken(String token) {
        return parse(token).getSubject();
    }
}
