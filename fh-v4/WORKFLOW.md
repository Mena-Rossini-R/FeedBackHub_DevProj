# FeedbackHub — Project Workflow Guide

A reference document for new team members to understand how the entire system works end-to-end.

---

## 1. What is FeedbackHub?

FeedbackHub is a **training program management system** used by trainers to track trainee performance across a batch/cohort. It provides:
- Score tracking (individual + bulk Excel upload)
- Automated skill alerts when trainees score below 80%
- Trainer ↔ trainee feedback threads per score
- Pod/cohort management and leaderboard
- Activity audit trail

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Java 17, Spring Boot 3, Spring Security (JWT), Spring Data JPA |
| Database | MySQL 8 (`feedbackhub` schema, port 3306) |
| Excel parsing | Apache POI |
| Frontend | Angular 17, Angular Material, RxJS |
| Auth | JWT tokens (stored in `localStorage`, attached via `JwtInterceptor`) |

---

## 3. Project Structure

```
fh-v4/
├── backend_fb_v3/                  ← Spring Boot app (port 8090)
│   └── src/main/java/com/feedbackhub/
│       ├── controller/             ← HTTP endpoints (REST API)
│       ├── service/                ← Business logic
│       ├── entity/                 ← JPA database tables
│       ├── dto/                    ← Request/response shapes (API contracts)
│       ├── repository/             ← Database queries (Spring Data JPA)
│       ├── security/               ← JWT filter, UserDetailsService
│       └── config/                 ← SecurityConfig, DataSeeder
│
└── frontend/                       ← Angular app (port 4200)
    └── src/app/
        ├── features/
        │   ├── auth/               ← Login page
        │   ├── trainer/            ← All trainer pages
        │   └── trainee/            ← All trainee pages
        ├── core/
        │   ├── services/           ← api.services.ts (all HTTP calls), auth.service.ts
        │   ├── guards/             ← auth.guard.ts (route protection)
        │   └── interceptors/       ← jwt.interceptor.ts (attaches token to every request)
        ├── shared/
        │   ├── models/             ← index.ts (all TypeScript interfaces)
        │   └── components/         ← loading-spinner, etc.
        ├── layout/                 ← main-layout.component.ts (sidebar nav shell)
        ├── app.module.ts           ← root module
        └── app-routing.module.ts   ← all routes
```

---

## 4. Authentication Flow

```
User fills login form (login.component.ts)
    ↓
POST /api/auth/login  →  AuthController.login()
    ↓
AuthService.login() → validates credentials with BCrypt
    ↓
JwtService.generateToken() → creates JWT (email stored as subject)
    ↓
JWT returned to frontend → stored in localStorage via AuthService
    ↓
Every subsequent request:
    JwtInterceptor (frontend) → attaches "Authorization: Bearer <token>"
    JwtAuthFilter (backend)   → extracts email, loads User, sets SecurityContext
    @AuthenticationPrincipal  → injects UserDetails into any controller method
```

**Role-based access:**
- `TRAINER` role → can access `/trainer/**` endpoints + all score/feedback endpoints
- `TRAINEE` role → can access `/trainee/**` endpoints
- Any authenticated user → can access `/scores/**` (score reads/uploads)
- Frontend `AuthGuard` checks role and redirects if wrong

---


## 5. Score Upload Flow

### Single score (trainer enters manually)
```
Trainer fills score form (bulk-upload.component.ts)
    ↓
POST /api/scores  →  ScoreController.create()
    ↓
ScoreService.createScore()
    ├── Looks up trainee by ID, trainer by email (from JWT)
    ├── Auto-computes grade (A+/A/B+…D) if not provided
    ├── Computes trend (UP/DOWN/STABLE vs last score)
    ├── Saves Score to DB
    ├── Logs to ActivityLog
    └── If score < 80% → SkillAlertService.createAlert()
```

### Bulk upload (Excel)
```
Trainer uploads .xlsx file (bulk-upload.component.ts)
    ↓
POST /api/scores/bulk-upload  →  ScoreController.bulkUpload()
    ↓
ScoreService.bulkUpload()
    ├── Auto-detects header row (scans first 3 rows for column names)
    ├── Falls back to fixed column positions if no headers found
    ├── For each row: calls createScore() (same pipeline as single)
    └── Returns BulkUploadResult { successCount, errorCount, errors[] }
```

---

## 6. Skill Alert Flow

```
ScoreService detects score < 80% after any upload
    ↓
SkillAlertService.createAlert()
    ├── CRITICAL  if score < 60%   → "Immediate attention required"
    ├── WARNING   if score 60–79%  → "Below passing threshold"
    └── MAINTAIN  if score ≥ 80%   → "Keep it up" (score still logged)
    ↓
Alert stored in DB (SkillAlert entity)
    ↓
Trainee sees alerts on skill-alerts.component.ts (3-column layout)
    ├── PATCH /api/trainee/alerts/{id}/acknowledge  → sets acknowledged = true
    └── PATCH /api/trainee/alerts/{id}/resolve      → sets resolved = true
```

**Colour coding (consistent across all pages):**
| Score | Colour | Meaning |
|-------|--------|---------|
| ≥ 80% | 🟢 Green | MAINTAIN — on track |
| 60–79% | 🟡 Amber | WARNING — needs improvement |
| < 60% | 🔴 Red | CRITICAL — urgent attention |

---

## 7. Feedback Thread Flow

```
Trainer views a score → clicks "Give Feedback"
    ↓
POST /api/feedback  →  FeedbackController.addMessage()
    ↓
FeedbackService.addMessage()
    ├── Saves FeedbackThread row (senderRole = TRAINER)
    ├── Sets readByTrainer = true, readByTrainee = false
    └── Score.feedbackStatus stays PENDING until trainee opens it
    ↓
Trainee sees unread badge on nav (polled every 30s via /api/feedback/unread-trainee-counts)
    ↓
Trainee opens feedback thread
    ↓
GET /api/feedback/score/{scoreId}  → loads all messages
    Score.feedbackStatus → VIEWED
    ↓
Trainee replies → POST /api/feedback
    ↓
Trainer sees unread badge → opens trainer feedback view
GET /api/feedback/unread-counts  → trainer unread badge
```

---

## 8. Cohort Management Flow

```
Trainer uploads cohort Excel (bulk-upload.component.ts → Tab 2)
    ↓
POST /api/trainer/cohort/upload  →  CohortController.uploadCohort()
    ↓
CohortService.uploadCohort()
    ├── For each row: find user by email
    │   ├── If exists → update pod/cohort assignment
    │   └── If new    → create User with TRAINEE role + temp password (BCrypt encoded)
    └── Returns UploadResult { createdCount, updatedCount, errorCount }
    ↓
Trainer can also:
    ├── GET    /api/trainer/cohort/structure       → nested cohort → pod → trainees tree
    ├── GET    /api/trainer/cohort/unassigned      → trainees not yet in any pod
    ├── POST   /api/trainer/cohort/add-trainee     → add single trainee manually
    ├── PUT    /api/trainer/cohort/assign          → move trainee to different pod/cohort
    └── DELETE /api/trainer/cohort/remove/{id}     → remove trainee from pod
```

---

## 9. Dashboard Flow

```
On login, frontend redirects to role-specific dashboard:
    TRAINER → /trainer/dashboard  →  trainer-dashboard.component.ts
    TRAINEE → /trainee/dashboard  →  trainee-dashboard.component.ts

Trainer dashboard (GET /api/trainer/dashboard):
    DashboardService.getTrainerDashboard()
        ├── Total trainees, class avg score
        ├── At-risk count (trainees whose avg score < 80%)
        ├── Per-pod averages (queried dynamically from DB — no hardcoding)
        ├── List of at-risk students
        └── Recent ActivityLog entries (last 10)

Trainee dashboard (GET /api/trainee/dashboard):
    DashboardService.getTraineeDashboard()
        ├── Overall progress % (avg of all their scores)
        ├── Assignments submitted count
        ├── Pending feedback count
        └── Weekly score trend (for the bar chart)
```

---

## 10. My Cohort Page (Trainee)

```
Trainee opens "My Cohort" page  →  cohort-info.component.ts
    ↓
Two parallel API calls:
    GET /api/scores/trainee/{id}       → own scores (for personal stats)
    GET /api/scores/pod-performance    → all pod members' avg scores (uses JWT to find pod)
    ↓
Page shows:
    ├── Cohort info card: cohort name, avg score, assessment count, pod size
    ├── Pod info card: full name, email, pod, cohort, rank
    └── Pod Leaderboard:
            ├── If 1 member only → "You're the only member" message
            └── If 2+ members   → ranked list with medals (🥇🥈🥉), progress bars, "You" badge
```

---

## 11. Key Design Patterns

| Pattern | Where Used | Why |
|---------|-----------|-----|
| **JWT Stateless Auth** | SecurityConfig, JwtAuthFilter | No server-side sessions |
| **DTO separation** | All controllers | Entities never exposed directly; DTOs are the API contract |
| **Service layer** | All business logic in `*Service.java` | Controllers are thin; services are testable |
| **Lazy AuthenticationManager** | AuthService | Avoids circular Spring bean dependency |
| **PATCH for state transitions** | AlertController, FeedbackController | Partial update, not full replace |
| **Single `api.services.ts`** | Frontend | All HTTP calls in one file — easy to find |
| **Unread badge polling** | main-layout.component.ts | RxJS `interval(30000)` — simple, no WebSocket needed |

---

## 12. API Endpoint Summary

All endpoints are prefixed with `/api` (set in `application.properties` as `server.servlet.context-path=/api`).

| Method | Path | Who Calls It | What It Does |
|--------|------|--------------|-------------|
| POST | `/auth/login` | Login page | Authenticate, return JWT |
| POST | `/auth/register` | Login page | Register new user |
| POST | `/scores` | Trainer — single upload | Upload one score |
| POST | `/scores/bulk-upload` | Trainer — bulk upload | Upload scores from Excel |
| GET  | `/scores/trainee/{id}` | Scorecards, My Cohort | Get a trainee's own scores |
| GET  | `/scores/trainer` | Trainer views | Get scores entered by this trainer |
| GET  | `/scores/all` | Student directory | Get all scores in the system |
| GET  | `/scores/pod-performance` | My Cohort page | Pod members' avg scores (uses JWT) |
| GET  | `/trainer/dashboard` | Trainer dashboard | Trainer KPI summary |
| GET  | `/trainee/dashboard` | Trainee dashboard | Trainee progress summary |
| POST | `/trainer/cohort/upload` | Bulk upload (Tab 2) | Upload cohort Excel |
| GET  | `/trainer/cohort/structure` | Pod manager | Get cohort → pod → trainee tree |
| GET  | `/trainer/cohort/unassigned` | Pod manager | Trainees without a pod |
| POST | `/trainer/cohort/add-trainee` | Pod manager | Add single trainee |
| PUT  | `/trainer/cohort/assign` | Pod manager | Move trainee to pod |
| DELETE | `/trainer/cohort/remove/{id}` | Pod manager | Remove trainee from pod |
| POST | `/feedback` | Feedback thread | Send a message |
| GET  | `/feedback/score/{scoreId}` | Feedback thread | Load conversation |
| GET  | `/feedback/unread-counts` | Layout (trainer) | Unread badge count |
| GET  | `/feedback/unread-trainee-counts` | Layout (trainee) | Unread badge count |
| GET  | `/trainee/alerts/{traineeId}` | Skill alerts | Get trainee's alerts |
| PATCH | `/trainee/alerts/{id}/acknowledge` | Skill alerts | Mark alert as seen |
| PATCH | `/trainee/alerts/{id}/resolve` | Skill alerts | Mark alert as resolved |
| GET  | `/template/score-upload` | Bulk upload | Download score Excel template |
| GET  | `/template/cohort-upload` | Bulk upload | Download cohort Excel template |

---

## 13. Running the Project

### Backend
```bash
cd backend_fb_v3
mvn spring-boot:run
# Runs on http://localhost:8090/api
# Requires MySQL running locally with schema: feedbackhub
# DB config: application.properties (username: root, password: root)
```

### Frontend
```bash
cd frontend
npm install
ng serve
# Runs on http://localhost:4200
# API base URL configured in environment.ts
```

### Default test accounts (seeded by DataSeeder.java on first run)
> DataSeeder only runs when the `user` table is empty. To re-seed, truncate all tables and restart.

| Role | Email | Password | Pod |
|------|-------|----------|-----|
| Trainer | trainer@fh.com | password | — |
| Trainee | ravi@fh.com | password | Pod C (5 members) |
| Trainee | divya@fh.com | password | Pod C |
| Trainee | arjun@fh.com | password | Pod C |
| Trainee | priya@fh.com | password | Pod C |
| Trainee | rohit@fh.com | password | Pod C |
| Trainee | suresh@fh.com | password | Pod D (solo) |
| Trainee | meena@fh.com | password | Pod A (Cohort 11) |
| Trainee | anitha@fh.com | password | Pod A (Cohort 11) |

