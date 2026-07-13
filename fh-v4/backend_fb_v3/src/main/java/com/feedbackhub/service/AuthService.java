package com.feedbackhub.service;

import com.feedbackhub.dto.AuthDto;
import com.feedbackhub.entity.User;
import com.feedbackhub.enums.UserRole;
import com.feedbackhub.exception.ResourceNotFoundException;
import com.feedbackhub.repository.UserRepository;
import com.feedbackhub.security.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * AuthService — handles login and registration logic.
 *
 * Login:
 *  1. Delegates credential check to Spring Security's AuthenticationManager.
 *     (It will throw BadCredentialsException if wrong — handled globally.)
 *  2. Loads the User from DB and generates a JWT via JwtService.
 *  3. Returns user info + JWT to the client.
 *
 * Registration:
 *  - Hashes the password with BCrypt before saving.
 *  - Returns a JWT immediately (user is logged in after registration).
 *
 * Note: ApplicationContext is used to lazily fetch AuthenticationManager
 * to avoid a circular dependency with SecurityConfig.
 */
@Service
public class AuthService {

    @Autowired private UserRepository      userRepo;
    @Autowired private PasswordEncoder     encoder;
    @Autowired private JwtService          jwtService;
    @Autowired private ApplicationContext  applicationContext;

    private AuthenticationManager getAuthManager() {
        return applicationContext.getBean(AuthenticationManager.class);
    }

    public AuthDto.AuthResponse login(AuthDto.LoginRequest req) {
        // Throws BadCredentialsException if credentials are wrong
        getAuthManager().authenticate(
                new UsernamePasswordAuthenticationToken(req.getEmail(), req.getPassword()));

        User user = userRepo.findByEmail(req.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return buildResponse(user);
    }

    public AuthDto.AuthResponse register(AuthDto.RegisterRequest req) {
        if (userRepo.existsByEmail(req.getEmail())) {
            throw new IllegalArgumentException("Email already registered: " + req.getEmail());
        }
        User user = new User();
        user.setFullName(req.getFullName());
        user.setEmail(req.getEmail());
        user.setPassword(encoder.encode(req.getPassword())); // BCrypt hash
        user.setRole(UserRole.valueOf(req.getRole().toUpperCase()));
        user.setDepartment(req.getDepartment());
        user.setPodName(req.getPodName());
        user.setCohortName(req.getCohortName());
        user.setActive(true);
        user = userRepo.save(user);

        return buildResponse(user);
    }

    /** Builds the auth response DTO with JWT and user info. */
    private AuthDto.AuthResponse buildResponse(User user) {
        AuthDto.AuthResponse response = new AuthDto.AuthResponse();
        response.setToken(jwtService.generateToken(user));
        response.setRole(user.getRole().name());
        response.setFullName(user.getFullName());
        response.setUserId(user.getId());
        response.setEmail(user.getEmail());
        response.setPodName(user.getPodName());
        response.setCohortName(user.getCohortName());
        return response;
    }
}
