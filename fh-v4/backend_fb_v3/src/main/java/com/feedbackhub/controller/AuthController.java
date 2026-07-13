package com.feedbackhub.controller;

import com.feedbackhub.dto.AuthDto;
import com.feedbackhub.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * AuthController — handles login and registration.
 *
 * Login flow:
 *  1. Client sends email + password to POST /auth/login.
 *  2. Spring Security authenticates the credentials.
 *  3. A JWT token is returned — client stores it and sends it in every subsequent request.
 *
 * All other endpoints require the JWT in the Authorization header:
 *   Authorization: Bearer <token>
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired private AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<AuthDto.AuthResponse> login(@RequestBody AuthDto.LoginRequest req) {
        return ResponseEntity.ok(authService.login(req));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthDto.AuthResponse> register(@RequestBody AuthDto.RegisterRequest req) {
        return ResponseEntity.ok(authService.register(req));
    }
}
