package com.feedbackhub.service;

import com.feedbackhub.dto.DashboardDto;
import com.feedbackhub.dto.UserDto;
import com.feedbackhub.entity.Score;
import com.feedbackhub.entity.User;
import com.feedbackhub.enums.FeedbackStatus;
import com.feedbackhub.enums.UserRole;
import com.feedbackhub.exception.ResourceNotFoundException;
import com.feedbackhub.repository.ScoreRepository;
import com.feedbackhub.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * DashboardService — builds summary data for both trainer and trainee home pages.
 *
 * Trainer dashboard shows:
 *  - Total trainees, class average, students below threshold, active pods.
 *  - Per-pod score averages (computed dynamically from DB).
 *  - List of at-risk students (avg < 80%).
 *  - Recent activity log entries.
 *
 * Trainee dashboard shows:
 *  - Overall progress %, assignments done, pending feedback count.
 *  - Week-by-week score trend for the bar chart.
 *  - Recent activity items related to this trainee.
 */
@Service
@Transactional(readOnly = true)
public class DashboardService {

    @Autowired private UserRepository     userRepo;
    @Autowired private ScoreRepository    scoreRepo;
    @Autowired private ActivityLogService logService;

    public DashboardDto getTrainerDashboard(String trainerEmail) {
        List<User> trainees = userRepo.findByRole(UserRole.TRAINEE);

        // Single pass: compute class average and collect at-risk students
        double totalAvg = 0;
        int    count    = 0;
        List<UserDto.Response> atRisk = new ArrayList<>();

        for (User t : trainees) {
            Optional<Double> avg = scoreRepo.findAvgScoreByTrainee(t);
            if (avg.isPresent()) {
                totalAvg += avg.get();
                count++;
                if (avg.get() < 80) {
                    UserDto.Response ud = new UserDto.Response();
                    ud.setId(t.getId());
                    ud.setFullName(t.getFullName());
                    ud.setEmail(t.getEmail());
                    ud.setPodName(t.getPodName());
                    ud.setLatestScore(avg.get());
                    atRisk.add(ud);
                }
            }
        }
        double classAvg = count > 0 ? totalAvg / count : 0;

        // Pod averages — fetched from distinct pod names in DB (no hardcoding)
        Map<String, Double> podAverages = new LinkedHashMap<>();
        for (String pod : userRepo.findDistinctPodNames()) {
            // Skip null or blank pod names that slipped through
            if (pod == null || pod.isBlank()) continue;
            podAverages.put(pod, scoreRepo.findAvgScoreByPod(pod).orElse(0.0));
        }

        DashboardDto dto = new DashboardDto();
        dto.setTotalStudents((long) trainees.size());
        dto.setAvgScore(Math.round(classAvg * 10.0) / 10.0);
        dto.setBelowThreshold((long) atRisk.size());
        dto.setActivePods((long) podAverages.values().stream().filter(v -> v > 0).count());
        dto.setPodAverages(podAverages);
        dto.setAtRiskStudents(atRisk);
        dto.setRecentActivity(logService.getRecentActivity(10));
        return dto;
    }

    public DashboardDto getTraineeDashboard(String traineeEmail) {
        User trainee = userRepo.findByEmail(traineeEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Trainee not found"));

        List<Score> scores = scoreRepo.findByTraineeOrderBySubmittedDateDesc(trainee);

        double overallAvg     = scores.stream().mapToDouble(Score::getScore).average().orElse(0);
        long   pendingFeedback = scoreRepo.countByTraineeAndFeedbackStatus(trainee, FeedbackStatus.PENDING);

        // Build week-by-week trend map (first occurrence per week label wins)
        Map<String, Double> weeklyTrend = new LinkedHashMap<>();
        for (Score s : scores) {
            if (s.getWeekLabel() != null && !weeklyTrend.containsKey(s.getWeekLabel())) {
                weeklyTrend.put(s.getWeekLabel(), s.getScore());
            }
        }

        DashboardDto dto = new DashboardDto();
        dto.setOverallProgress(Math.round(overallAvg * 10.0) / 10.0);
        dto.setAssignmentsDone((long) scores.size());
        dto.setTotalAssignments((long) scores.size() + 4); // +4 represents upcoming planned assessments
        dto.setPendingFeedback(pendingFeedback);
        dto.setWeeklyTrend(weeklyTrend);
        dto.setRecentActivity(logService.getRecentActivityForTrainee(trainee.getFullName(), 6));
        return dto;
    }
}
