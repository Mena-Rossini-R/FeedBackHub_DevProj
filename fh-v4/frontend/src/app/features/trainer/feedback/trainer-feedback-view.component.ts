import { Component, OnInit } from '@angular/core';
import { FeedbackService, ScoreService } from '../../../core/services/api.services';
import { ScoreResponse, FeedbackResponse } from '../../../shared/models';
import { FormControl, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

interface StudentGroup {
  name: string;
  email: string;
  scores: ScoreResponse[];
  totalUnread: number;
}

/**
 * TrainerFeedbackViewComponent — the trainer's feedback interface.
 *
 * On load, fetches all scores that have an active feedback thread (status
 * PENDING / VIEWED / ACKNOWLEDGED) and groups them by trainee. The trainer
 * selects a trainee in the left panel, then selects an assignment to view
 * the full message thread.
 *
 * Unread badge: the backend tracks how many trainee messages the trainer
 * hasn't read yet. When a thread is opened, the local unread count for that
 * score is cleared immediately (optimistic update) so the badge disappears
 * without needing a round-trip.
 *
 * The trainer can reply via sendReply(). Sent messages are appended to the
 * local messages array for instant feedback.
 */
@Component({
  selector: 'app-trainer-feedback-view',
  templateUrl: './trainer-feedback-view.component.html',
  styleUrls: ['./trainer-feedback-view.component.scss']
})
export class TrainerFeedbackViewComponent implements OnInit {
  students: StudentGroup[] = [];
  selectedStudent: StudentGroup | null = null;
  selectedScore: ScoreResponse | null = null;
  messages: FeedbackResponse[] = [];
  messageCtrl = new FormControl('', Validators.required);
  loading = false;
  loadingMessages = false;
  sending = false;
  unreadCounts: Record<number, number> = {};

  constructor(
    private feedbackSvc: FeedbackService,
    private scoreSvc: ScoreService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    // Fetch unread counts first so they are ready when the student list renders.
    this.feedbackSvc.getUnreadCounts().subscribe({ next: (c) => { this.unreadCounts = c; }, error: () => {} });
    this.scoreSvc.getTrainerScores().subscribe({
      next: (scores) => {
        const filtered = scores.filter(s =>
          s.feedbackStatus === 'PENDING' || s.feedbackStatus === 'VIEWED' || s.feedbackStatus === 'ACKNOWLEDGED'
        );
        // Group by trainee email
        const map = new Map<string, StudentGroup>();
        for (const s of filtered) {
          if (!map.has(s.traineeEmail)) {
            map.set(s.traineeEmail, { name: s.traineeName, email: s.traineeEmail, scores: [], totalUnread: 0 });
          }
          map.get(s.traineeEmail)!.scores.push(s);
        }
        this.students = Array.from(map.values());
        this.updateUnreadTotals();
        this.loading = false;
      },
      error: () => { this.loading = false; this.snack.open('Failed to load', 'Close', { duration: 3000 }); }
    });
  }

  updateUnreadTotals(): void {
    for (const st of this.students) {
      st.totalUnread = st.scores.reduce((sum, s) => sum + (this.unreadCounts[s.id] || 0), 0);
    }
  }

  selectStudent(student: StudentGroup): void {
    this.selectedStudent = student;
    this.selectedScore = null;
    this.messages = [];
    // Skip the assignment picker step when the trainee has only one score.
    if (student.scores.length === 1) {
      this.selectScore(student.scores[0]);
    }
  }

  selectScore(score: ScoreResponse): void {
    this.selectedScore = score;
    this.loadingMessages = true;
    this.feedbackSvc.getThread(score.id).subscribe({
      next: (msgs) => {
          this.messages = msgs;
          this.loadingMessages = false;
          // Optimistically clear the unread badge for this score so the UI updates immediately
          // without waiting for the next getUnreadCounts() call.
          delete this.unreadCounts[score.id];
        if (this.selectedStudent) {
          this.selectedStudent.totalUnread = this.selectedStudent.scores
            .reduce((sum, s) => sum + (this.unreadCounts[s.id] || 0), 0);
        }
      },
      error: () => { this.loadingMessages = false; this.snack.open('Failed to load messages', 'Close', { duration: 3000 }); }
    });
  }

  sendReply(): void {
    if (!this.messageCtrl.value?.trim() || !this.selectedScore) return;
    this.sending = true;
    this.feedbackSvc.addMessage(this.selectedScore.id, this.messageCtrl.value.trim()).subscribe({
      next: (msg) => { this.messages.push(msg); this.messageCtrl.reset(); this.sending = false; },
      error: () => { this.sending = false; this.snack.open('Failed to send', 'Close', { duration: 3000 }); }
    });
  }

  hasUnread(scoreId: number): boolean {
    return !!this.unreadCounts[scoreId] && this.unreadCounts[scoreId] > 0;
  }

  isTrainer(role: string): boolean { return role === 'TRAINER'; }
}