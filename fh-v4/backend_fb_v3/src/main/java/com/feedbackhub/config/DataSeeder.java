package com.feedbackhub.config;

import com.feedbackhub.entity.Score;
import com.feedbackhub.entity.User;
import com.feedbackhub.enums.FeedbackStatus;
import com.feedbackhub.enums.TrendDirection;
import com.feedbackhub.enums.UserRole;
import com.feedbackhub.repository.ScoreRepository;
import com.feedbackhub.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * DataSeeder — seeds test data on application startup (dev/demo only).
 *
 * Workflow position: Runs once via CommandLineRunner when the Spring context starts.
 * Creates default trainer and trainee accounts if they don't already exist.
 * Safe to run repeatedly — checks existence before inserting.
 */
@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private ScoreRepository scoreRepo;

    @Autowired
    private PasswordEncoder encoder;

    @Override
    public void run(String... args) {
        if (userRepo.count() > 0) return;

        System.out.println("Seeding demo data...");

         // ── Trainers ──────────────────────────────────────────────────────
         User trainer = new User();
         trainer.setFullName("Trainer Alex");
         trainer.setEmail("trainer@fh.com");
         trainer.setPassword(encoder.encode("password"));
         trainer.setRole(UserRole.TRAINER);
         trainer.setDepartment("Training");
         trainer.setPhone("+91-9800000001");
         trainer.setActive(true);
         trainer = userRepo.save(trainer);

         // ── Second Trainer ─────────────────────────────────────────────────
         User trainer2 = new User();
         trainer2.setFullName("Trainer Bob");
         trainer2.setEmail("trainer2@fh.com");
         trainer2.setPassword(encoder.encode("password"));
         trainer2.setRole(UserRole.TRAINER);
         trainer2.setDepartment("Training");
         trainer2.setPhone("+91-9800000002");
         trainer2.setActive(true);
         trainer2 = userRepo.save(trainer2);

         // ── Pod C — Cohort 12 (5 members: shows a full pod leaderboard) ───
        User t1 = makeTrainee("Ravi Kumar",    "ravi@fh.com",    "Pod C","Cohort 12","Full Stack QA","+91-9800000101");
        t1 = userRepo.save(t1);

        User t2 = makeTrainee("Divya Sharma",  "divya@fh.com",   "Pod C","Cohort 12","Full Stack QA","+91-9800000102");
        t2 = userRepo.save(t2);

        User t6 = makeTrainee("Arjun Nair",    "arjun@fh.com",   "Pod C","Cohort 12","Full Stack QA","+91-9800000106");
        t6 = userRepo.save(t6);

        User t7 = makeTrainee("Priya Iyer",    "priya@fh.com",   "Pod C","Cohort 12","Full Stack QA","+91-9800000107");
        t7 = userRepo.save(t7);

        User t8 = makeTrainee("Rohit Das",     "rohit@fh.com",   "Pod C","Cohort 12","Full Stack QA","+91-9800000108");
        t8 = userRepo.save(t8);

        // ── Pod D — Cohort 12 (1 member only: shows solo-pod state) ──────
        User t4 = makeTrainee("Suresh Babu",   "suresh@fh.com",  "Pod D","Cohort 12","Full Stack QA","+91-9800000104");
        t4 = userRepo.save(t4);

        // ── Pod A — Cohort 11 (2 members) ─────────────────────────────────
        User t5 = makeTrainee("Meena Thomas",  "meena@fh.com",   "Pod A","Cohort 11","Data Engineering","+91-9800000105");
        t5 = userRepo.save(t5);

        User t9 = makeTrainee("Anitha Raj",    "anitha@fh.com",  "Pod A","Cohort 11","Data Engineering","+91-9800000109");
        t9 = userRepo.save(t9);

        // ── Scores for Ravi (Pod C) ───────────────────────────────────────
        String[] assignments = {"Sprint Planning Review","API Design","Unit Test Coverage","Code Review","Standup Observation","Sprint Retrospective","Design Patterns Quiz","Peer Review Task"};
        double[] rScores     = {82, 78, 44, 75, 88, 70, 58, 72};
        String[] categories  = {"Project Mgmt","Technical","Testing","Technical","Communication","Process","Technical","Collaboration"};
        String[] grades      = {"B","B+","D","B","A","B-","C+","B"};
        String[] weeks       = {"W1","W2","W3","W4","W5","W6","W7","W8"};
        for (int i = 0; i < assignments.length; i++) {
            addScore(t1, trainer, assignments[i], categories[i], rScores[i], grades[i], weeks[i], 30 - i * 3);
        }

        // ── Scores for Divya (Pod C) ──────────────────────────────────────
        double[] dScores = {68, 72, 65, 70, 74};
        String[] dAssgn  = {"API Basics","SQL Queries","REST Testing","Docker Intro","CI/CD Pipeline"};
        for (int i = 0; i < dScores.length; i++) {
            addScore(t2, trainer, dAssgn[i], "Technical", dScores[i], "B-", "W"+(i+1), 20 - i * 3);
        }

        // ── Scores for Arjun (Pod C) — high performer ────────────────────
        double[] aScores = {90, 85, 92, 88, 95};
        String[] aAssgn  = {"System Design","Microservices","Load Testing","API Security","Performance Tuning"};
        for (int i = 0; i < aScores.length; i++) {
            addScore(t6, trainer, aAssgn[i], "Technical", aScores[i], "A", "W"+(i+1), 25 - i * 3);
        }

        // ── Scores for Priya (Pod C) — mid performer ─────────────────────
        double[] pScores = {76, 80, 71, 83};
        String[] pAssgn  = {"Unit Testing","Code Coverage","Bug Tracking","Test Plans"};
        for (int i = 0; i < pScores.length; i++) {
            addScore(t7, trainer, pAssgn[i], "Testing", pScores[i], "B", "W"+(i+1), 18 - i * 3);
        }

        // ── Scores for Rohit (Pod C) — struggling ─────────────────────────
        double[] rohScores = {55, 62, 48, 60};
        String[] rohAssgn  = {"Agile Sprint","Kanban Board","Scrum Events","Backlog Grooming"};
        for (int i = 0; i < rohScores.length; i++) {
            addScore(t8, trainer, rohAssgn[i], "Process", rohScores[i], "C", "W"+(i+1), 22 - i * 3);
        }

        // ── Suresh (Pod D — solo pod) — low score triggers alert ─────────
        addScore(t4, trainer, "API Testing Module", "Testing", 44.0, "D", "W3", 5);
        addScore(t4, trainer, "REST Fundamentals", "Technical", 52.0, "D+", "W4", 10);

        // ── Meena (Pod A) ─────────────────────────────────────────────────
        double[] mScores = {78, 83, 70, 88};
        String[] mAssgn  = {"Data Pipelines","ETL Basics","Spark Intro","SQL Advanced"};
        for (int i = 0; i < mScores.length; i++) {
            addScore(t5, trainer, mAssgn[i], "Data Engineering", mScores[i], "B", "W"+(i+1), 15 - i * 3);
        }

        // ── Anitha (Pod A) ─────────────────────────────────────────────────
        double[] anScores = {85, 79, 90};
        String[] anAssgn  = {"Data Warehousing","Data Modelling","Python for Data"};
        for (int i = 0; i < anScores.length; i++) {
            addScore(t9, trainer, anAssgn[i], "Data Engineering", anScores[i], "A-", "W"+(i+1), 12 - i * 3);
        }

         System.out.println("Demo data seeded.");
         System.out.println("Logins (password: password):");
         System.out.println("  Trainers: trainer@fh.com | trainer2@fh.com");
         System.out.println("  Pod C   : ravi@fh.com | divya@fh.com | arjun@fh.com | priya@fh.com | rohit@fh.com");
         System.out.println("  Pod D   : suresh@fh.com  (solo pod)");
         System.out.println("  Pod A   : meena@fh.com | anitha@fh.com");
    }

    /** Helper: build a trainee User without saving. */
    private User makeTrainee(String name, String email, String pod, String cohort, String dept, String phone) {
        User u = new User();
        u.setFullName(name);
        u.setEmail(email);
        u.setPassword(encoder.encode("password"));
        u.setRole(UserRole.TRAINEE);
        u.setPodName(pod);
        u.setCohortName(cohort);
        u.setDepartment(dept);
        u.setPhone(phone);
        u.setActive(true);
        return u;
    }

    /** Helper: create and save a Score. */
    private void addScore(User trainee, User trainer, String assignment, String category,
                          double score, String grade, String week, int daysAgo) {
        Score s = new Score();
        s.setTrainee(trainee);
        s.setTrainer(trainer);
        s.setAssignmentName(assignment);
        s.setCategory(category);
        s.setScore(score);
        s.setGrade(grade);
        s.setSubmittedDate(LocalDate.now().minusDays(daysAgo));
        s.setWeekLabel(week);
        s.setFeedbackStatus(FeedbackStatus.PENDING);
        s.setTrend(score >= 70 ? TrendDirection.UP : TrendDirection.DOWN);
        scoreRepo.save(s);
    }
}
