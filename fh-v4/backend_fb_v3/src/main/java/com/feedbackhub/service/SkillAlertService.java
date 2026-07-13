package com.feedbackhub.service;

import com.feedbackhub.dto.AlertDto;
import com.feedbackhub.entity.SkillAlert;
import com.feedbackhub.entity.User;
import com.feedbackhub.enums.AlertLevel;
import com.feedbackhub.exception.ResourceNotFoundException;
import com.feedbackhub.repository.SkillAlertRepository;
import com.feedbackhub.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * SkillAlertService — auto-creates and manages skill alerts for trainees.
 *
 * Triggered by ScoreService.createScore() whenever a score < 80% is saved.
 *
 * Alert levels (based on score):
 *  - CRITICAL  (< 60%)  → immediate intervention needed
 *  - WARNING   (60–79%) → below passing threshold, needs improvement
 *  - MAINTAIN  (≥ 80%)  → score is acceptable, keep it up
 *
 * Alerts appear on the trainee's "Skill Alerts" page and are counted on the
 * trainee dashboard KPI card.
 */
@Service
@Transactional
public class SkillAlertService {

    @Autowired
    private SkillAlertRepository alertRepo;

    @Autowired
    private UserRepository userRepo;

    /**
     * Called by ScoreService after every score save. Determines the alert level from
     * the raw score and creates a new SkillAlert record. Every submission below 80%
     * always generates a fresh alert (no deduplication) so the full history is preserved.
     */
    public void createAlert(User trainee, String skillName, double scoreValue, String trainerEmail) {
        AlertLevel level;
        String message;
        // Threshold rules:
        // red = CRITICAL (<60%), amber = WARNING (60-79%), green = MAINTAIN (>=80%)
        if (scoreValue < 60) {
            level   = AlertLevel.CRITICAL;
            message = "Score " + (int) scoreValue + "% - below 60%. Immediate attention required.";
        } else if (scoreValue < 80) {
            level   = AlertLevel.WARNING;
            message = "Score " + (int) scoreValue + "% - below 80% threshold. Needs improvement.";
        } else {
            level   = AlertLevel.MAINTAIN;
            message = "Score " + (int) scoreValue + "% - keep maintaining this performance.";
        }

        SkillAlert alert = new SkillAlert();
        alert.setTrainee(trainee);
        alert.setSkillName(skillName);
        alert.setScoreValue(scoreValue);
        alert.setAlertLevel(level);
        alert.setMessage(message);
        alert.setAcknowledged(false);
        alert.setResolved(false);
        alertRepo.save(alert);
    }

    /** Returns all alerts for a trainee, newest first. Used by both trainee dashboard and the Skill Alerts page. */
    @Transactional(readOnly = true)
    public List<AlertDto.Response> getAlertsForTrainee(Long traineeId) {
        User trainee = userRepo.findById(traineeId)
                .orElseThrow(() -> new ResourceNotFoundException("Trainee not found"));
        List<SkillAlert> alerts = alertRepo.findByTraineeOrderByCreatedAtDesc(trainee);
        List<AlertDto.Response> result = new ArrayList<>();
        for (SkillAlert a : alerts) { result.add(toResponse(a)); }
        return result;
    }

    /** Trainee acknowledges the alert — records the timestamp but keeps it visible until resolved. */
    public AlertDto.Response acknowledge(Long alertId) {
        SkillAlert alert = alertRepo.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found"));
        alert.setAcknowledged(true);
        alert.setAcknowledgedAt(LocalDateTime.now());
        return toResponse(alertRepo.save(alert));
    }

    /** Trainee marks the alert resolved — it is excluded from the dashboard unresolved count. */
    public AlertDto.Response resolve(Long alertId) {
        SkillAlert alert = alertRepo.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found"));
        alert.setResolved(true);
        return toResponse(alertRepo.save(alert));
    }

    private AlertDto.Response toResponse(SkillAlert a) {
        AlertDto.Response dto = new AlertDto.Response();
        dto.setId(a.getId());
        dto.setSkillName(a.getSkillName());
        dto.setScoreValue(a.getScoreValue());
        dto.setAlertLevel(a.getAlertLevel());
        dto.setMessage(a.getMessage());
        dto.setAcknowledged(a.isAcknowledged());
        dto.setResolved(a.isResolved());
        dto.setCreatedAt(a.getCreatedAt());
        dto.setAcknowledgedAt(a.getAcknowledgedAt());
        return dto;
    }
}
