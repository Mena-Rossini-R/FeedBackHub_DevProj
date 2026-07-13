package com.feedbackhub.service;

import com.feedbackhub.dto.ActivityLogDto;
import com.feedbackhub.entity.ActivityLog;
import com.feedbackhub.repository.ActivityLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * ActivityLogService — records every significant action in the system.
 *
 * Called by other services (ScoreService, FeedbackService, etc.) to log events.
 * Logs appear on the Trainer Dashboard "Recent Activity" feed.
 *
 * Activity types used:
 *  - SCORE_UPLOADED  → single score added by trainer
 *  - BULK_UPLOAD     → batch Excel upload
 *  - FEEDBACK_GIVEN  → message posted in feedback thread
 *  - FEEDBACK_VIEWED → trainee opened feedback thread
 *  - ALERT_CREATED   → skill alert auto-generated
 *  - COHORT_UPDATED  → trainee pod/cohort assignment changed
 */
@Service
public class ActivityLogService {

    @Autowired private ActivityLogRepository repo;

    /** Record a new activity event. */
    public void log(String type, String description, String performedBy, String targetEntity) {
        repo.save(new ActivityLog(type, description, performedBy, targetEntity));
    }

    /** Latest N activity entries across all users (for trainer dashboard). */
    public List<ActivityLogDto> getRecentActivity(int limit) {
        return toDto(repo.findAllByOrderByCreatedAtDesc(PageRequest.of(0, limit)));
    }

    /** Latest N activity entries for a specific trainee (for trainee dashboard). */
    public List<ActivityLogDto> getRecentActivityForTrainee(String traineeName, int limit) {
        return toDto(repo.findByTargetEntityOrderByCreatedAtDesc(traineeName, PageRequest.of(0, limit)));
    }

    private List<ActivityLogDto> toDto(List<ActivityLog> logs) {
        return logs.stream().map(a -> {
            ActivityLogDto dto = new ActivityLogDto();
            dto.setId(a.getId());
            dto.setActivityType(a.getActivityType());
            dto.setDescription(a.getDescription());
            dto.setPerformedBy(a.getPerformedBy());
            dto.setTargetEntity(a.getTargetEntity());
            dto.setCreatedAt(a.getCreatedAt());
            return dto;
        }).collect(Collectors.toList());
    }
}
