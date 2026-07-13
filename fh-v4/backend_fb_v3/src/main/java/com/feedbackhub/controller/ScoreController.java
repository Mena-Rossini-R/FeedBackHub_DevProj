package com.feedbackhub.controller;

import com.feedbackhub.dto.ScoreDto;
import com.feedbackhub.service.ScoreService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * ScoreController — handles all score-related HTTP endpoints.
 *
 * Workflow:
 *  1. Trainer creates a score manually (POST /scores) or via bulk Excel upload.
 *  2. When a score < 80%, SkillAlertService auto-creates a SkillAlert for the trainee.
 *  3. Trainee can view their own scores (GET /scores/trainee/{id}).
 *  4. Trainer can view all scores they entered (GET /scores/trainer).
 */
@RestController
@RequestMapping("/scores")
public class ScoreController {

    @Autowired private ScoreService scoreService;

    /** Trainer manually adds a single score for a trainee. */
    @PostMapping
    public ResponseEntity<ScoreDto.Response> create(
            @RequestBody ScoreDto.Request req,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(scoreService.createScore(req, ud.getUsername()));
    }

    /** Trainee fetches all their own scores. */
    @GetMapping("/trainee/{traineeId}")
    public ResponseEntity<List<ScoreDto.Response>> getByTrainee(@PathVariable Long traineeId) {
        return ResponseEntity.ok(scoreService.getScoresByTrainee(traineeId));
    }

    /** Trainer fetches all scores they have uploaded. */
    @GetMapping("/trainer")
    public ResponseEntity<List<ScoreDto.Response>> getByTrainer(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(scoreService.getScoresByTrainer(ud.getUsername()));
    }

    /** Fetch every score in the system (admin/trainer use). */
    @GetMapping("/all")
    public ResponseEntity<List<ScoreDto.Response>> getAll() {
        return ResponseEntity.ok(scoreService.getAllScores());
    }

    /**
     * Returns pod performance data for the trainee's own pod.
     * Used by the trainee "My Cohort" page to compare pod-mates.
     * Returns a list of { traineeName, traineeEmail, avgScore, scoreCount } for each pod member.
     */
    @GetMapping("/pod-performance")
    public ResponseEntity<List<Map<String, Object>>> getPodPerformance(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(scoreService.getPodPerformance(ud.getUsername()));
    }

    /**
     * Bulk upload scores via Excel file (.xlsx).
     * Excel columns: name | email | category | assignment | score | grade | weekLabel
     * The service auto-detects headers and handles missing optional columns.
     */
    @PostMapping("/bulk-upload")
    public ResponseEntity<ScoreDto.BulkUploadResult> bulkUpload(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(scoreService.bulkUpload(file, ud.getUsername()));
    }
}
