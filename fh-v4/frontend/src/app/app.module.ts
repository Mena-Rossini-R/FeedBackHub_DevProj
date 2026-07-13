/**
 * AppModule — root Angular module for FeedbackHub.
 *
 * Declares all components, imports Angular Material + HTTP modules,
 * provides the JwtInterceptor (attaches Bearer token to every API call),
 * and bootstraps AppComponent.
 *
 * Feature modules are NOT used — all components are declared here for simplicity.
 * Routes are defined in AppRoutingModule (app-routing.module.ts).
 */
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { JwtInterceptor } from './core/interceptors/jwt.interceptor';
import { MainLayoutComponent } from './layout/main-layout.component';
import { LoginComponent } from './features/auth/login.component';
import { TrainerDashboardComponent } from './features/trainer/dashboard/trainer-dashboard.component';
import { StudentDirectoryComponent } from './features/trainer/directory/student-directory.component';
import { PodManagerComponent } from './features/trainer/pods/pod-manager.component';
import { BulkUploadComponent } from './features/trainer/upload/bulk-upload.component';
import { ActivityLogComponent } from './features/trainer/activity/activity-log.component';
import { TraineeDashboardComponent } from './features/trainee/dashboard/trainee-dashboard.component';
import { ScorecardsComponent } from './features/trainee/scorecards/scorecards.component';
import { FeedbackThreadComponent } from './features/trainee/feedback/feedback-thread.component';
import { SkillAlertsComponent } from './features/trainee/alerts/skill-alerts.component';
import { CohortInfoComponent } from './features/trainee/cohort/cohort-info.component';
import { LoadingSpinnerComponent } from './shared/components/loading-spinner.component';
import { TrainerFeedbackViewComponent } from './features/trainer/feedback/trainer-feedback-view.component';

const MAT = [
  MatToolbarModule, MatSidenavModule, MatListModule, MatIconModule, MatButtonModule,
  MatCardModule, MatTableModule, MatInputModule, MatFormFieldModule, MatSelectModule,
  MatSnackBarModule, MatProgressSpinnerModule, MatProgressBarModule, MatTooltipModule,
  MatTabsModule, MatBadgeModule, MatChipsModule, MatDividerModule, MatPaginatorModule, MatSortModule
];

@NgModule({
  declarations: [
    AppComponent, MainLayoutComponent, LoginComponent,
    TrainerDashboardComponent, StudentDirectoryComponent, PodManagerComponent,
    BulkUploadComponent, ActivityLogComponent,TrainerFeedbackViewComponent,
    TraineeDashboardComponent, ScorecardsComponent, FeedbackThreadComponent,
    SkillAlertsComponent, CohortInfoComponent,
    LoadingSpinnerComponent
  ],
  imports: [BrowserModule, BrowserAnimationsModule, HttpClientModule,
            FormsModule, ReactiveFormsModule, AppRoutingModule, ...MAT],
  providers: [{ provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true }],
  bootstrap: [AppComponent]
})
export class AppModule {}
