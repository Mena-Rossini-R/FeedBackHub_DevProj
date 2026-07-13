import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { ScoreService } from '../../../core/services/api.services';
import { ScoreResponse } from '../../../shared/models';
import { MatSnackBar } from '@angular/material/snack-bar';

/**
 * StudentDirectoryComponent — trainer's full view of all trainees and their scores.
 *
 * Workflow position: Accessible from trainer sidebar nav → "Student Directory".
 * Displays a filterable/searchable table of trainees with score summaries.
 * Trainer can click a trainee to see all their scores and drill into feedback.
 * Uses ScoreService and UserService to load data.
 */
@Component({
  templateUrl: './student-directory.component.html',
  styleUrls: ['./student-directory.component.scss']
})
export class StudentDirectoryComponent implements OnInit {
  displayedColumns = ['traineeName','traineeEmail','podName','assignmentName','score','grade','trend','feedbackStatus'];
  dataSource = new MatTableDataSource<ScoreResponse>([]);
  loading = false;
  searchTerm = '';
  podFilter = '';
  pods: string[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort)      sort!: MatSort;

  constructor(private scoreSvc: ScoreService, private snack: MatSnackBar) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.scoreSvc.getTrainerScores().subscribe({
      next: d => {
        this.dataSource.data = d;
        this.pods = [...new Set(d.map(s => s.podName).filter(Boolean))];
        setTimeout(() => { this.dataSource.paginator = this.paginator; this.dataSource.sort = this.sort; });
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  applyFilter(): void {
    const f = this.searchTerm.trim().toLowerCase();
    const p = this.podFilter;
    this.dataSource.filterPredicate = (row: ScoreResponse) => {
      const matchText = !f || row.traineeName.toLowerCase().includes(f) || row.traineeEmail.toLowerCase().includes(f);
      const matchPod  = !p || row.podName === p;
      return matchText && matchPod;
    };
    this.dataSource.filter = f + p; // trigger re-filter
  }

  getScoreColor(s: number): string { return s >= 80 ? '#059669' : s >= 60 ? '#D97706' : '#DC2626'; }
  getScoreClass(s: number): string { return s >= 80 ? 'score-green' : s >= 60 ? 'score-amber' : 'score-red'; }
  getTrendIcon(t: string): string  { return t==='UP'?'trending_up':t==='DOWN'?'trending_down':'trending_flat'; }
  getTrendClass(t: string): string { return t==='UP'?'trend-up':t==='DOWN'?'trend-down':'trend-stable'; }
}
