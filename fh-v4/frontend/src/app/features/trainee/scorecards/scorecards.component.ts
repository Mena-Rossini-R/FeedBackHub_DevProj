import { Component, OnInit } from '@angular/core';
import { ScoreService } from '../../../core/services/api.services';
import { AuthService } from '../../../core/services/auth.service';
import { ScoreResponse } from '../../../shared/models';

/**
 * ScorecardsComponent — trainee's personal score history page.
 *
 * Workflow position: Accessible from trainee sidebar nav → "My Scores".
 * Shows a table of all the trainee's scores sorted by date.
 * Each row shows assignment, category, score, grade, trend (↑↓→), and feedback status.
 * Clicking a row links to the FeedbackThread for that score.
 * Uses ScoreService to load scores for the logged-in trainee.
 */
@Component({
  selector: 'app-scorecards',
  templateUrl: './scorecards.component.html',
  styleUrls: ['./scorecards.component.scss']
})
export class ScorecardsComponent implements OnInit {
  scores: ScoreResponse[] = [];
  loading = true;
  displayedColumns = ['assignmentName','category','score','grade','weekLabel','submittedDate','trend'];

  // Scorecard detail
  selectedScore: ScoreResponse | null = null;

  constructor(private scoreSvc: ScoreService, private auth: AuthService) {}

  ngOnInit(): void {
    const userId = this.auth.getCurrentUser()?.userId;
    if (!userId) return;
    this.scoreSvc.getTraineeScores(userId).subscribe({
      next: d => { this.scores = d; this.loading = false; },
      error: () => this.loading = false
    });
  }

  get avgScore(): number  { return this.scores.length ? this.scores.reduce((s,x)=>s+x.score,0)/this.scores.length : 0; }
  get bestScore(): number { return this.scores.length ? Math.max(...this.scores.map(s=>s.score)) : 0; }
  get lowScore():  number { return this.scores.length ? Math.min(...this.scores.map(s=>s.score)) : 0; }

  getScoreClass(s: number): string   { return s>=80?'score-green':s>=60?'score-amber':'score-red'; }
  getScoreColor(s: number): string   { return s>=80?'#059669':s>=60?'#D97706':'#DC2626'; }
  getTrendIcon(t: string): string    { return t==='UP'?'trending_up':t==='DOWN'?'trending_down':'trending_flat'; }
  getTrendColor(t: string): string   { return t==='UP'?'#059669':t==='DOWN'?'#DC2626':'#94A3B8'; }
  getCategoryColor(cat: string): string {
    const m: Record<string,string> = {
      'Technical':'#2A70B2','Testing':'#C22626','Communication':'#1A8240',
      'Project Mgmt':'#12987A','Process':'#6838A8','Collaboration':'#BE780E'
    };
    return m[cat] ?? '#5C728C';
  }
}
