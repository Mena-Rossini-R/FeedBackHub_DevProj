package com.feedbackhub.controller;

import com.feedbackhub.dto.DashboardDto;
import com.feedbackhub.service.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * DashboardController — serves the home-page summary for each role.
 *
 * Security:
 *  - /trainer/dashboard  → only TRAINER (enforced by SecurityConfig /trainer/** rule)
 *  - /trainee/dashboard  → TRAINEE or TRAINER (enforced by /trainee/** rule)
 *
 * The JWT token identifies the caller; the email is extracted from it
 * to load the correct data.
 */
@RestController
public class DashboardController {

    @Autowired private DashboardService dashboardService;

    @GetMapping("/trainer/dashboard")
    public ResponseEntity<DashboardDto> trainerDashboard(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(dashboardService.getTrainerDashboard(ud.getUsername()));
    }

    @GetMapping("/trainee/dashboard")
    public ResponseEntity<DashboardDto> traineeDashboard(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(dashboardService.getTraineeDashboard(ud.getUsername()));
    }
}
