package com.neetlu.examhunt.web;

import com.neetlu.examhunt.service.AuthService;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public AuthService.AuthResult register(@RequestBody RegisterRequest body) {
        return authService.register(body.email(), body.password(), body.displayName());
    }

    @PostMapping("/login")
    public AuthService.AuthResult login(@RequestBody LoginRequest body) {
        return authService.login(body.email(), body.password());
    }

    @GetMapping("/me")
    public AuthService.UserProfile me(@AuthenticationPrincipal String userId) {
        return authService.profileFor(authService.requireUser(userId));
    }

    public record RegisterRequest(
            @NotBlank @Email String email,
            @NotBlank String password,
            String displayName) {}

    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}
}
