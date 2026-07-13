// layout/main-layout.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { FeedbackService } from '../core/services/api.services';
import { AuthResponse } from '../shared/models';
import { Subscription, interval } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';

/**
 * MainLayoutComponent — the app shell after login.
 *
 * Renders: sidebar nav + top toolbar + <router-outlet> (page content).
 *
 * Nav links differ by role:
 *  - TRAINER sees: Dashboard, Bulk Upload, Pod Manager, Student Directory, Activity, Feedback.
 *  - TRAINEE sees: Dashboard, Scorecards, Feedback Thread, Skill Alerts, Cohort.
 *
 * Unread feedback badge:
 *  - Polls the backend every 30 seconds to get unread message counts.
 *  - The total is shown as a number badge next to "Feedback" in the sidebar.
 */
@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  currentUser: AuthResponse | null = null;
  sidebarOpen = true;
  feedbackUnreadCount = 0;
  private pollSub: Subscription | null = null;

  trainerLinks = [
    { path: '/trainer/dashboard', icon: 'dashboard',  label: 'Dashboard' },
    { path: '/trainer/upload',    icon: 'upload_file', label: 'Bulk Upload' },
    { path: '/trainer/pods',      icon: 'groups',      label: 'Pod Manager' },
    { path: '/trainer/students',  icon: 'people',      label: 'Student Directory' },
    { path: '/trainer/activity',  icon: 'history',     label: 'Activity Log' },
    { path: '/trainer/feedback',  icon: 'chat',        label: 'Student Feedback', feedbackBadge: true },
  ];

  traineeLinks = [
    { path: '/trainee/dashboard',  icon: 'dashboard',     label: 'My Dashboard' },
    { path: '/trainee/scorecards', icon: 'assignment',    label: 'My Scorecards' },
    { path: '/trainee/feedback',   icon: 'chat',          label: 'Feedback Thread', feedbackBadge: true },
    { path: '/trainee/alerts',     icon: 'notifications', label: 'Skill Alerts' },
    { path: '/trainee/cohort',     icon: 'group',         label: 'My Cohort' },
  ];

  constructor(public auth: AuthService, private router: Router, private feedbackSvc: FeedbackService) {}

  ngOnInit(): void {
    this.currentUser = this.auth.getCurrentUser();
    if (this.router.url === '/') {
      this.router.navigate([this.auth.isTrainer() ? '/trainer/dashboard' : '/trainee/dashboard']);
    }
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  startPolling(): void {
    const countFn = this.auth.isTrainer()
      ? () => this.feedbackSvc.getUnreadCounts()
      : () => this.feedbackSvc.getUnreadTraineeCounts();

    this.pollSub = interval(30000).pipe(
      startWith(0),
      switchMap(() => countFn())
    ).subscribe({
      next: (counts) => {
        this.feedbackUnreadCount = Object.values(counts).reduce((sum, v) => sum + v, 0);
      },
      error: () => {}
    });
  }

  get navLinks() { return this.auth.isTrainer() ? this.trainerLinks : this.traineeLinks; }
  logout(): void { this.auth.logout(); }
  toggle(): void { this.sidebarOpen = !this.sidebarOpen; }
}
