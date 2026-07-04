package com.neetlu.examhunt.config;

import com.neetlu.examhunt.security.AdminKeyAuthFilter;
import com.neetlu.examhunt.security.JwtAuthFilter;
import com.neetlu.examhunt.security.RateLimitFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(AppProperties props) {
        CorsConfiguration config = new CorsConfiguration();
        CorsSupport.apply(config, props);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(
            HttpSecurity http,
            RateLimitFilter rateLimitFilter,
            AdminKeyAuthFilter adminKeyAuthFilter,
            JwtAuthFilter jwtAuthFilter)
            throws Exception {
        http.cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .anonymous(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex.authenticationEntryPoint(
                        new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/actuator/health").permitAll()
                        .requestMatchers("/api/auth/register", "/api/auth/login", "/api/auth/google").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auth/google/status").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/exams", "/api/exams/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/packs", "/api/packs/**").permitAll()
                        .requestMatchers(HttpMethod.PUT, "/api/questions/*/feedback").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/questions/*/feedback").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/questions/*/family").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/questions/search").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/questions").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/questions/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/leaderboard", "/api/leaderboard/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/settings/public", "/api/practice-ai/status")
                        .permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/seo/**").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers(
                                        "/api/auth/me",
                                        "/api/practice/**",
                                        "/api/practice-ai/**",
                                        "/api/bookmarks/**",
                                        "/api/revision/**",
                                        "/api/ai-tutor/**")
                        .authenticated()
                        .anyRequest().denyAll())
                .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(adminKeyAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
