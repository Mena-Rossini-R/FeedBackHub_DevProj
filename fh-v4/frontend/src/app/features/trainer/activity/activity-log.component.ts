// features/trainer/activity/activity-log.component.ts
import { Component, OnInit } from '@angular/core';
import { DashboardService } from '../../../core/services/api.services';
import { ActivityLog } from '../../../shared/models';

@Component({
  selector: 'app-activity-log',
  template: `
  <div class="page-wrapper">
    <div class="page-header"><div><h2>Activity Log</h2><p>Timestamped record of feedback and student engagement</p></div>
      <button mat-raised-button color="primary" (click)="load()"><mat-icon>refresh</mat-icon></button>
    </div>
    <app-loading-spinner *ngIf="loading"></app-loading-spinner>
    <mat-card *ngIf="!loading">
      <mat-card-content>
        <div class="empty-state" *ngIf="!logs.length"><mat-icon>history</mat-icon><p>No activity yet</p></div>
        <div class="timeline">
          <div class="tl-item" *ngFor="let a of logs">
            <div class="tl-dot" [style.background]="getColor(a.activityType)">
              <mat-icon>{{ getIcon(a.activityType) }}</mat-icon>
            </div>
            <div class="tl-content">
              <div class="tl-action">{{ a.activityType | titlecase }}</div>
              <div class="tl-desc">{{ a.description }}</div>
              <div class="tl-meta">{{ a.performedBy }} · {{ a.createdAt | date:'medium' }}</div>
            </div>
          </div>
        </div>
      </mat-card-content>
    </mat-card>
  </div>`,
  styles: [`
    .page-wrapper { max-width:900px; }
    .page-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;
      h2{margin:0 0 4px;font-size:22px;font-weight:700;color:#0E1630;} p{margin:0;color:#5C728C;} }
    .timeline { display:flex; flex-direction:column; gap:4px; }
    .tl-item { display:flex; gap:14px; padding:14px 0; border-bottom:1px solid #F0F4F8; &:last-child{border-bottom:none;} }
    .tl-dot { width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;
      mat-icon { font-size:18px; width:18px; height:18px; color:#fff; } }
    .tl-action { font-size:13px; font-weight:700; color:#0E1630; }
    .tl-desc   { font-size:13px; color:#5C728C; margin:2px 0; }
    .tl-meta   { font-size:11px; color:#9BA8BB; }
  `]
})
export class ActivityLogComponent implements OnInit {
  logs: ActivityLog[] = [];
  loading = true;

  constructor(private dashSvc: DashboardService) {}
  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.dashSvc.getTrainerDashboard().subscribe({
      next: (d) => { this.logs = d.recentActivity ?? []; this.loading = false; },
      error: () => this.loading = false
    });
  }

  getIcon(type: string): string {
    const m: Record<string,string> = {
      SCORE_UPLOADED:'upload', BULK_UPLOAD:'upload_file',
      FEEDBACK_GIVEN:'comment', FEEDBACK_VIEWED:'visibility'
    };
    return m[type] ?? 'info';
  }

  getColor(type: string): string {
    const m: Record<string,string> = {
      SCORE_UPLOADED:'#1A8240', BULK_UPLOAD:'#2A70B2',
      FEEDBACK_GIVEN:'#12987A', FEEDBACK_VIEWED:'#BE780E'
    };
    return m[type] ?? '#5C728C';
  }
}
