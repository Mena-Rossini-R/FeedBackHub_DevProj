import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './layout/main-layout.component';
import { LoginComponent } from './features/auth/login.component';
import { TrainerDashboardComponent } from './features/trainer/dashboard/trainer-dashboard.component';
import { StudentDirectoryComponent } from './features/trainer/directory/student-directory.component';
import { PodManagerComponent } from './features/trainer/pods/pod-manager.component';
import { BulkUploadComponent } from './features/trainer/upload/bulk-upload.component';
import { ActivityLogComponent } from './features/trainer/activity/activity-log.component';
import { TrainerFeedbackViewComponent } from './features/trainer/feedback/trainer-feedback-view.component';
import { TraineeDashboardComponent } from './features/trainee/dashboard/trainee-dashboard.component';
import { ScorecardsComponent } from './features/trainee/scorecards/scorecards.component';
import { FeedbackThreadComponent } from './features/trainee/feedback/feedback-thread.component';
import { SkillAlertsComponent } from './features/trainee/alerts/skill-alerts.component';
import { CohortInfoComponent } from './features/trainee/cohort/cohort-info.component';

/**
 * App routing — all pages and their URL paths.
 *
 * Structure:
 *  /login                    → public login page
 *  / (MainLayout, guarded)   → shell with sidebar + router-outlet
 *    /trainer/dashboard      → trainer home page
 *    /trainer/upload         → bulk score + cohort Excel upload
 *    /trainer/pods           → manage pod assignments
 *    /trainer/students       → student score directory
 *    /trainer/activity       → activity audit log
 *    /trainer/feedback       → feedback thread inbox
 *    /trainee/dashboard      → trainee home page
 *    /trainee/scorecards     → trainee's own scores
 *    /trainee/feedback       → trainee's feedback thread
 *    /trainee/alerts         → skill alerts (CRITICAL / WARNING / MAINTAIN)
 *    /trainee/cohort         → trainee's cohort + pod info
 *
 * AuthGuard redirects unauthenticated users to /login.
 * Role-based access is enforced by the backend (SecurityConfig).
 */
const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '', component: MainLayoutComponent, canActivate: [AuthGuard],
    children: [
      // ── Trainer pages ────────────────────────────────────────────────────
      { path: 'trainer/dashboard',  component: TrainerDashboardComponent },
      { path: 'trainer/upload',     component: BulkUploadComponent },
      { path: 'trainer/pods',       component: PodManagerComponent },
      { path: 'trainer/students',   component: StudentDirectoryComponent },
      { path: 'trainer/activity',   component: ActivityLogComponent },
      { path: 'trainer/feedback',   component: TrainerFeedbackViewComponent },
      // ── Trainee pages ────────────────────────────────────────────────────
      { path: 'trainee/dashboard',  component: TraineeDashboardComponent },
      { path: 'trainee/scorecards', component: ScorecardsComponent },
      { path: 'trainee/feedback',   component: FeedbackThreadComponent },
      { path: 'trainee/alerts',     component: SkillAlertsComponent },
      { path: 'trainee/cohort',     component: CohortInfoComponent },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];

@NgModule({ imports: [RouterModule.forRoot(routes)], exports: [RouterModule] })
export class AppRoutingModule {}
