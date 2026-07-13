// features/trainer/dashboard/trainer-dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { DashboardService } from '../../../core/services/api.services';
import { DashboardStats } from '../../../shared/models';
import { MatSnackBar } from '@angular/material/snack-bar';

/**
 * TrainerDashboardComponent — the trainer's home page.
 *
 * Displays a summary KPI row (total trainees, average score, at-risk count),
 * a per-pod average score list, an at-risk student table, and a recent
 * activity feed. All data is fetched in a single API call to getTrainerDashboard().
 *
 * Helper methods (getScoreClass, getPodEntries, getActivityIcon) are used
 * directly from the template to keep the HTML declarative.
 */
@Component({
  selector: 'app-trainer-dashboard',
  templateUrl: './trainer-dashboard.component.html',
  styleUrls: ['./trainer-dashboard.component.scss']
})
export class TrainerDashboardComponent implements OnInit {
  stats: DashboardStats | null = null;
  loading = true;

  constructor(private dashSvc: DashboardService, private snack: MatSnackBar) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.dashSvc.getTrainerDashboard().subscribe({
      next: (d) => { this.stats = d; this.loading = false; },
      error: (err: any) => {
        this.loading = false;
        console.error('Dashboard load error:', err);
        // Prefer a server-provided message; fall back to the JS error string.
        const message = err.error?.message || err.message || 'Failed to load dashboard';
        this.snack.open(message, 'Close', { duration: 5000 });
      }
    });
  }

  // Returns a CSS class name that colours a score cell: green >=80, amber 60-79, red <60.
  getScoreClass(score: number): string {
    return score >= 80 ? 'score-green' : score >= 60 ? 'score-amber' : 'score-red';
  }

  // Converts the podAverages map into an array so *ngFor can iterate it in the template.
  getPodEntries(): { pod: string; avg: number }[] {
    if (!this.stats?.podAverages) return [];
    return Object.entries(this.stats.podAverages).map(([pod, avg]) => ({ pod, avg }));
  }

  // Maps activity-log event types to Material icon names for the activity feed.
  getActivityIcon(type: string): string {
    const m: Record<string, string> = {
      SCORE_UPLOADED: 'upload', BULK_UPLOAD: 'upload_file',
      FEEDBACK_GIVEN: 'comment', FEEDBACK_VIEWED: 'visibility'
    };
    return m[type] ?? 'info';
  }
}
