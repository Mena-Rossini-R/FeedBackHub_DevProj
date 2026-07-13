// features/trainee/cohort/cohort-info.component.ts
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { ScoreService } from '../../../core/services/api.services';
import { AuthResponse, ScoreResponse } from '../../../shared/models';

export interface PodMember {
  traineeId: number;
  traineeName: string;
  traineeEmail: string;
  avgScore: number;
  scoreCount: number;
  isCurrentUser: boolean;
}

/**
 * CohortInfoComponent — personal cohort/pod details + pod performance leaderboard.
 * Shows the trainee's own info cards, then compares them against pod peers.
 */
@Component({
  selector: 'app-cohort-info',
  templateUrl: './cohort-info.component.html',
  styleUrls: ['./cohort-info.component.scss']
})
export class CohortInfoComponent implements OnInit {
  currentUser: AuthResponse | null = null;
  ownScores: ScoreResponse[] = [];
  podMembers: PodMember[] = [];
  loading = true;
  private _loaded = 0;

  constructor(private auth: AuthService, private scoreSvc: ScoreService) {}

  ngOnInit(): void {
    this.currentUser = this.auth.getCurrentUser();
    const userId = this.currentUser?.userId;
    if (!userId) { this.loading = false; return; }

    // Load own scores (for personal details stats)
    this.scoreSvc.getScoresByTrainee(userId).subscribe({
      next: (d) => { this.ownScores = d; this._checkDone(); },
      error: () => this._checkDone()
    });

    // Load pod leaderboard
    this.scoreSvc.getPodPerformance().subscribe({
      next: (data: PodMember[]) => { this.podMembers = data; this._checkDone(); },
      error: () => this._checkDone()
    });
  }

  private _checkDone(): void { if (++this._loaded >= 2) this.loading = false; }

  get myAvg(): number {
    if (!this.ownScores.length) return 0;
    return Math.round(this.ownScores.reduce((s, r) => s + r.score, 0) / this.ownScores.length);
  }

  get myEntry(): PodMember | undefined {
    return this.podMembers.find(m => m.isCurrentUser);
  }

  get myRank(): number {
    const idx = this.podMembers.findIndex(m => m.isCurrentUser);
    return idx === -1 ? 0 : idx + 1;
  }

  get podAvg(): number {
    if (!this.podMembers.length) return 0;
    return Math.round(this.podMembers.reduce((s, m) => s + m.avgScore, 0) / this.podMembers.length);
  }

  getScoreClass(score: number): string {
    return score >= 80 ? 'score-green' : score >= 60 ? 'score-amber' : 'score-red';
  }

  getBarWidth(score: number): string { return Math.min(score, 100) + '%'; }

  getMedalIcon(rank: number): string {
    return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
  }
}
