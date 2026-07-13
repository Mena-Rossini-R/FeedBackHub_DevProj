package com.feedbackhub.service;

import com.feedbackhub.dto.ScoreDto;
import com.feedbackhub.entity.Score;
import com.feedbackhub.entity.User;
import com.feedbackhub.enums.FeedbackStatus;
import com.feedbackhub.enums.TrendDirection;
import com.feedbackhub.exception.ResourceNotFoundException;
import com.feedbackhub.repository.ScoreRepository;
import com.feedbackhub.repository.UserRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
/**
 * ScoreService — core business logic for managing trainee scores.
 *
 * Key responsibilities:
 *  - Create a score (single or bulk via Excel).
 *  - Compute grade automatically if not provided.
 *  - Compute trend (UP/DOWN/STABLE) by comparing with the previous score.
 *  - Trigger a SkillAlert when score < 80%.
 *  - Log every score upload to the ActivityLog.
 */
@Service
@Transactional
public class ScoreService {

    @Autowired private ScoreRepository   scoreRepo;
    @Autowired private UserRepository    userRepo;
    @Autowired private ActivityLogService logService;
    @Autowired private SkillAlertService alertService;

    // ── Single Score Creation ────────────────────────────────────────────────

    public ScoreDto.Response createScore(ScoreDto.Request req, String trainerEmail) {
        User trainee = userRepo.findById(req.getTraineeId())
                .orElseThrow(() -> new ResourceNotFoundException("Trainee not found"));
        User trainer = userRepo.findByEmail(trainerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Trainer not found"));

        Score score = new Score();
        score.setTrainee(trainee);
        score.setTrainer(trainer);
        score.setAssignmentName(req.getAssignmentName());
        score.setCategory(req.getCategory());
        score.setScore(req.getScore());
        // Auto-compute grade if trainer didn't provide one
        score.setGrade(req.getGrade() != null ? req.getGrade() : computeGrade(req.getScore()));
        score.setSubmittedDate(req.getSubmittedDate() != null ? req.getSubmittedDate() : LocalDate.now());
        score.setWeekLabel(req.getWeekLabel());
        score.setFeedbackStatus(FeedbackStatus.PENDING);
        // Compare with latest previous score to compute UP/DOWN/STABLE
        score.setTrend(computeTrend(trainee, req.getScore()));
        score = scoreRepo.save(score);

        // Log the action
        logService.log("SCORE_UPLOADED", "Score uploaded for " + trainee.getFullName(), trainerEmail, trainee.getFullName());

        // Auto-alert trainee if score is below the threshold
        if (req.getScore() < 80) {
            alertService.createAlert(trainee, req.getAssignmentName(), req.getScore(), trainerEmail);
        }
        return toResponse(score);
    }

    // ── Fetch Queries ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ScoreDto.Response> getScoresByTrainee(Long traineeId) {
        User trainee = userRepo.findById(traineeId)
                .orElseThrow(() -> new ResourceNotFoundException("Trainee not found"));
        return scoreRepo.findByTraineeOrderBySubmittedDateDesc(trainee)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ScoreDto.Response> getScoresByTrainer(String trainerEmail) {
        User trainer = userRepo.findByEmail(trainerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Trainer not found"));
        return scoreRepo.findByTrainerOrderBySubmittedDateDesc(trainer)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ScoreDto.Response> getAllScores() {
        return scoreRepo.findAll().stream().map(this::toResponse).collect(Collectors.toList());
    }

    // ── Bulk Excel Upload ─────────────────────────────────────────────────────

    /**
     * Parses an Excel file and creates a score for each valid row.
     *
     * Supported column names (auto-detected from header row):
     *   name | email | category | assignment | score | grade (optional) | weekLabel (optional)
     *
     * Rows with unknown emails or invalid scores are collected as errors — they do NOT
     * stop the upload; valid rows are still processed.
     */
    public ScoreDto.BulkUploadResult bulkUpload(MultipartFile file, String trainerEmail) {
        List<ScoreDto.Response> uploaded = new ArrayList<>();
        List<String>            errors   = new ArrayList<>();

        try (InputStream is = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            int headerRow = 0;

            // ── Step 1: Auto-detect header row and column positions ──────────
            Map<String, Integer> col = new HashMap<>();
            for (int r = 0; r <= Math.min(2, sheet.getLastRowNum()); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;
                for (int c = 0; c < row.getLastCellNum(); c++) {
                    String hdr = getCellStr(row, c).toLowerCase().trim();
                    if (hdr.contains("email"))                              col.put("email",      c);
                    if (hdr.contains("name"))                               col.put("name",       c);
                    if (hdr.contains("assignment"))                         col.put("assignment", c);
                    if (hdr.contains("category") || hdr.contains("subject")) col.put("category", c);
                    if (hdr.contains("score")    || hdr.contains("mark"))  col.put("score",      c);
                    if (hdr.contains("grade"))                              col.put("grade",      c);
                    if (hdr.contains("week"))                               col.put("week",       c);
                    if (hdr.contains("date"))                               col.put("date",       c);
                }
                if (col.containsKey("email") || col.containsKey("score")) {
                    headerRow = r; break;
                }
            }

            // ── Step 2: Fallback to fixed column positions if no headers found
            // Default layout: col0=name, col1=email, col2=category, col3=assignment, col4=score, col5=grade
            col.putIfAbsent("email",      1);
            col.putIfAbsent("assignment", 3);
            col.putIfAbsent("category",   2);
            col.putIfAbsent("score",      4);
            col.putIfAbsent("grade",      5);
            col.putIfAbsent("week",       6);

            // ── Step 3: Process each data row ───────────────────────────────
            for (int i = headerRow + 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null || isRowEmpty(row)) continue;

                try {
                    String email = getCellStr(row, col.get("email"));
                    if (email.isEmpty()) { errors.add("Row " + (i+1) + ": email missing"); continue; }

                    String scoreStr = getCellStr(row, col.get("score"));
                    if (scoreStr.isEmpty()) { errors.add("Row " + (i+1) + ": score missing for " + email); continue; }

                    double scoreVal;
                    try {
                        scoreVal = Double.parseDouble(scoreStr.replace("%", "").trim());
                    } catch (NumberFormatException e) {
                        errors.add("Row " + (i+1) + ": invalid score '" + scoreStr + "' for " + email);
                        continue;
                    }

                    User trainee = userRepo.findByEmail(email).orElse(null);
                    if (trainee == null) {
                        errors.add("Row " + (i+1) + ": student not found: " + email);
                        continue;
                    }

                    String assignment = getCellStr(row, col.get("assignment"));
                    if (assignment.isEmpty()) assignment = "Assignment " + i;

                    ScoreDto.Request req = new ScoreDto.Request();
                    req.setTraineeId(trainee.getId());
                    req.setAssignmentName(assignment);
                    req.setCategory(getCellStr(row, col.get("category")));
                    req.setScore(scoreVal);
                    req.setGrade(getCellStr(row, col.get("grade")));
                    req.setWeekLabel(getCellStr(row, col.get("week")));
                    req.setSubmittedDate(LocalDate.now());
                    uploaded.add(createScore(req, trainerEmail));

                } catch (Exception e) {
                    errors.add("Row " + (i+1) + ": " + e.getMessage());
                }
            }

        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to process file: " + e.getMessage());
        }

        logService.log("BULK_UPLOAD", "Bulk upload: " + uploaded.size() + " scores", trainerEmail, "Batch");

        ScoreDto.BulkUploadResult result = new ScoreDto.BulkUploadResult();
        result.setUploaded(uploaded);
        result.setErrors(errors);
        result.setSuccessCount(uploaded.size());
        result.setErrorCount(errors.size());
        return result;
    }

    // ── Private Helpers ──────────────────────────────────────────────────────

    /** A–D grade scale based on score percentage. */
    private String computeGrade(double score) {
        if (score >= 90) return "A+";
        if (score >= 85) return "A";
        if (score >= 80) return "B+";
        if (score >= 75) return "B";
        if (score >= 70) return "B-";
        if (score >= 65) return "C+";
        if (score >= 60) return "C";
        return "D";
    }

    /** Read a cell as a clean string regardless of numeric/string type. */
    private String getCellStr(Row row, int col) {
        if (col < 0 || row.getCell(col) == null) return "";
        Cell cell = row.getCell(col);
        if (cell.getCellType() == CellType.NUMERIC) {
            double v = cell.getNumericCellValue();
            return v == Math.floor(v) ? String.valueOf((long) v) : String.valueOf(v);
        }
        return cell.toString().trim();
    }

    /** Returns true if every cell in the row is blank (skip empty rows). */
    private boolean isRowEmpty(Row row) {
        for (int c = 0; c < row.getLastCellNum(); c++) {
            Cell cell = row.getCell(c);
            if (cell != null && cell.getCellType() != CellType.BLANK
                    && !cell.toString().trim().isEmpty()) return false;
        }
        return true;
    }

    /**
     * Compares the new score with the trainee's most recent previous score.
     * > +2 points = UP, < -2 points = DOWN, otherwise STABLE.
     */
    private TrendDirection computeTrend(User trainee, double newScore) {
        List<Score> history = scoreRepo.findByTraineeOrderBySubmittedDateDesc(trainee,
                org.springframework.data.domain.PageRequest.of(0, 1));
        if (history.isEmpty()) return TrendDirection.STABLE;
        double prev = history.get(0).getScore();
        if (newScore > prev + 2)  return TrendDirection.UP;
        if (newScore < prev - 2)  return TrendDirection.DOWN;
        return TrendDirection.STABLE;
    }

    /**
     * Returns pod performance comparison for the trainee's own pod.
     * Each entry: { traineeName, traineeEmail, avgScore, scoreCount, isCurrentUser }
     * Sorted by avgScore descending so the trainee can see their rank.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getPodPerformance(String traineeEmail) {
        User me = userRepo.findByEmail(traineeEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        String pod = me.getPodName();
        // If the trainee has no pod assigned, still return them as the only member
        // so the frontend can show the solo-pod state with their own data.
        if (pod == null || pod.isBlank()) {
            Map<String, Object> solo = new LinkedHashMap<>();
            solo.put("traineeId",     me.getId());
            solo.put("traineeName",   me.getFullName());
            solo.put("traineeEmail",  me.getEmail());
            double myAvg = scoreRepo.findAvgScoreByTrainee(me).orElse(0.0);
            long myCount = scoreRepo.findByTraineeOrderBySubmittedDateDesc(me).size();
            solo.put("avgScore",      Math.round(myAvg * 10.0) / 10.0);
            solo.put("scoreCount",    myCount);
            solo.put("isCurrentUser", true);
            return List.of(solo);
        }

        // Get all trainees in this pod
        List<User> podMembers = userRepo.findByPodName(pod);

        List<Map<String, Object>> result = new ArrayList<>();
        for (User member : podMembers) {
            double avg = scoreRepo.findAvgScoreByTrainee(member).orElse(0.0);
            long count = scoreRepo.findByTraineeOrderBySubmittedDateDesc(member).size();
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("traineeId",      member.getId());
            entry.put("traineeName",    member.getFullName());
            entry.put("traineeEmail",   member.getEmail());
            entry.put("avgScore",       Math.round(avg * 10.0) / 10.0);
            entry.put("scoreCount",     count);
            entry.put("isCurrentUser",  member.getEmail().equals(traineeEmail));
            result.add(entry);
        }
        // Sort highest avg first so trainee sees their rank
        result.sort((a, b) -> Double.compare((double)b.get("avgScore"), (double)a.get("avgScore")));
        return result;
    }

    /** Converts a Score entity to the API response DTO. */
    public ScoreDto.Response toResponse(Score s) {
        ScoreDto.Response dto = new ScoreDto.Response();
        dto.setId(s.getId());
        dto.setTraineeName(s.getTrainee().getFullName());
        dto.setTraineeEmail(s.getTrainee().getEmail());
        dto.setPodName(s.getTrainee().getPodName());
        dto.setTrainerName(s.getTrainer().getFullName());
        dto.setAssignmentName(s.getAssignmentName());
        dto.setCategory(s.getCategory());
        dto.setScore(s.getScore());
        dto.setGrade(s.getGrade());
        dto.setSubmittedDate(s.getSubmittedDate());
        dto.setFeedbackStatus(s.getFeedbackStatus());
        dto.setTrend(s.getTrend());
        dto.setWeekLabel(s.getWeekLabel());
        dto.setCreatedAt(s.getCreatedAt());
        return dto;
    }
}
