import { Component, OnInit } from '@angular/core';
import { AlertService, ScoreService } from '../../../core/services/api.services';
import { AuthService } from '../../../core/services/auth.service';
import { AlertResponse, ScoreResponse } from '../../../shared/models';
import { MatSnackBar } from '@angular/material/snack-bar';

/**
 * SkillAlertsComponent — redesigned 3-column skill performance dashboard.
 *
 * Left column   — CRITICAL (score < 60%): assignments needing immediate attention.
 * Middle column — WARNING  (score 60–79%): assignments needing improvement.
 * Right column  — MAINTAIN (score ≥ 80%): assignments performing well.
 *
 * Also shows per-category averages derived from the trainee's full score history,
 * so the trainee can see which TOPICS (categories) are weak vs strong.
 *
 * Data sources:
 *  - AlertService.getAlerts()  → active alerts (acknowledge/resolve actions)
 *  - ScoreService.getScoresByTrainee() → full score history for category breakdown
 */
@Component({
  selector: 'app-skill-alerts',
  templateUrl: './skill-alerts.component.html',
  styleUrls: ['./skill-alerts.component.scss']
})
export class SkillAlertsComponent implements OnInit {
  alerts: AlertResponse[] = [];
  scores: ScoreResponse[] = [];
  loading = true;

  // Per-category averages computed from score history
  categoryStats: { category: string; avg: number; count: number; level: string }[] = [];

  constructor(
    private alertSvc: AlertService,
    private scoreSvc: ScoreService,
    private auth: AuthService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    const userId = this.auth.getCurrentUser()?.userId;
    if (!userId) return;

    // Load alerts and scores in parallel
    this.alertSvc.getAlerts(userId).subscribe({
      next: d => { this.alerts = d; this.checkLoaded(); },
      error: () => this.checkLoaded()
    });

    this.scoreSvc.getScoresByTrainee(userId).subscribe({
      next: d => { this.scores = d; this.buildCategoryStats(); this.checkLoaded(); },
      error: () => this.checkLoaded()
    });
  }

  private _loadedCount = 0;
  private checkLoaded() {
    this._loadedCount++;
    if (this._loadedCount >= 2) this.loading = false;
  }

  /** Compute per-category average score from full score history. */
  private buildCategoryStats() {
    const map: Record<string, number[]> = {};
    for (const s of this.scores) {
      const cat = s.category || 'General';
      if (!map[cat]) map[cat] = [];
      map[cat].push(s.score);
    }
    this.categoryStats = Object.entries(map).map(([category, vals]) => {
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const level = avg >= 80 ? 'MAINTAIN' : avg >= 60 ? 'WARNING' : 'CRITICAL';
      return { category, avg: Math.round(avg * 10) / 10, count: vals.length, level };
    }).sort((a, b) => a.avg - b.avg); // weakest first
  }

  acknowledge(alert: AlertResponse): void {
    this.alertSvc.acknowledge(alert.id).subscribe({
      next: u => {
        const i = this.alerts.findIndex(a => a.id === alert.id);
        if (i >= 0) this.alerts[i] = u;
        this.snack.open('Acknowledged', 'Close', { duration: 2000 });
      }
    });
  }

  resolve(alert: AlertResponse): void {
    this.alertSvc.resolve(alert.id).subscribe({
      next: u => {
        const i = this.alerts.findIndex(a => a.id === alert.id);
        if (i >= 0) this.alerts[i] = u;
        this.snack.open('Resolved', 'Close', { duration: 2000 });
      }
    });
  }

  // Filtered alert lists by level (unresolved only for active columns)
  get criticalAlerts(): AlertResponse[]  { return this.alerts.filter(a => a.alertLevel === 'CRITICAL' && !a.resolved); }
  get warningAlerts(): AlertResponse[]   { return this.alerts.filter(a => a.alertLevel === 'WARNING'  && !a.resolved); }
  get maintainAlerts(): AlertResponse[]  { return this.alerts.filter(a => a.alertLevel === 'MAINTAIN' && !a.resolved); }

  // Category stats split by performance level
  get criticalCats()  { return this.categoryStats.filter(c => c.level === 'CRITICAL'); }
  get warningCats()   { return this.categoryStats.filter(c => c.level === 'WARNING'); }
  get maintainCats()  { return this.categoryStats.filter(c => c.level === 'MAINTAIN'); }

  // Overall summary counts
  get totalUnresolved(): number { return this.alerts.filter(a => !a.resolved).length; }
  get overallAvg(): number {
    if (!this.scores.length) return 0;
    return Math.round(this.scores.reduce((s, r) => s + r.score, 0) / this.scores.length * 10) / 10;
  }

  get resolvedAlerts(): AlertResponse[] { return this.alerts.filter(a => a.resolved); }

  getLevelColor(level: string): string {
    return level === 'CRITICAL' ? '#C22626' : level === 'WARNING' ? '#BE780E' : '#1A8240';
  }
  getLevelBg(level: string): string {
    return level === 'CRITICAL' ? '#FEE2E2' : level === 'WARNING' ? '#FEF3C7' : '#DCFCE7';
  }
  getBarWidth(score: number): number { return Math.min(score, 100); }
}
