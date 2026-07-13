import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ScoreResponse, ScoreRequest, BulkUploadResult, CohortUploadResult,
         FeedbackResponse, AlertResponse, DashboardStats, UserProfile,
         CohortStructure, CohortStudentInfo } from '../../shared/models';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

/**
 * ScoreService — all score-related API calls.
 *
 * Flow: Trainer uploads score → backend auto-generates grade + trend + alert.
 * Frontend uses these scores for: scorecards, student directory, bulk upload.
 */
@Injectable({ providedIn: 'root' })
export class ScoreService {
  constructor(private http: HttpClient) {}
  createScore(req: ScoreRequest): Observable<ScoreResponse>             { return this.http.post<ScoreResponse>(`${API}/scores`, req); }
  getTraineeScores(id: number): Observable<ScoreResponse[]>             { return this.http.get<ScoreResponse[]>(`${API}/scores/trainee/${id}`); }
  getTrainerScores(): Observable<ScoreResponse[]>                        { return this.http.get<ScoreResponse[]>(`${API}/scores/trainer`); }
  getAllScores(): Observable<ScoreResponse[]>                             { return this.http.get<ScoreResponse[]>(`${API}/scores/all`); }
  bulkUpload(file: File): Observable<BulkUploadResult> {
    const fd = new FormData(); fd.append('file', file);
    return this.http.post<BulkUploadResult>(`${API}/scores/bulk-upload`, fd);
  }
  getScoresByTrainee(id: number): Observable<ScoreResponse[]>            { return this.getTraineeScores(id); }
  getPodPerformance(): Observable<any[]>                                 { return this.http.get<any[]>(`${API}/scores/pod-performance`); }
}

/**
 * FeedbackService — the trainer-trainee messaging thread.
 *
 * Each score has a feedback thread. Both parties can send messages.
 * Unread counts drive the badge shown on the sidebar nav icon.
 */
@Injectable({ providedIn: 'root' })
export class FeedbackService {
  constructor(private http: HttpClient) {}
  addMessage(scoreId: number, message: string): Observable<FeedbackResponse> {
    return this.http.post<FeedbackResponse>(`${API}/feedback`, { scoreId, message });
  }
  getThread(scoreId: number): Observable<FeedbackResponse[]>             { return this.http.get<FeedbackResponse[]>(`${API}/feedback/score/${scoreId}`); }
  /** Unread message counts keyed by scoreId — for trainer sidebar badge. */
  getUnreadCounts(): Observable<Record<number, number>>                  { return this.http.get<Record<number, number>>(`${API}/feedback/unread-counts`); }
  /** Unread message counts keyed by scoreId — for trainee sidebar badge. */
  getUnreadTraineeCounts(): Observable<Record<number, number>>           { return this.http.get<Record<number, number>>(`${API}/feedback/unread-trainee-counts`); }
  markViewed(scoreId: number): Observable<void>                          { return this.http.post<void>(`${API}/feedback/score/${scoreId}`, {}); }
}

/**
 * AlertService — skill alerts auto-created when score < 80%.
 * Levels: CRITICAL (< 60%), WARNING (60-79%), MAINTAIN (>= 80%).
 */
@Injectable({ providedIn: 'root' })
export class AlertService {
  constructor(private http: HttpClient) {}
  getAlerts(userId: number): Observable<AlertResponse[]>                 { return this.http.get<AlertResponse[]>(`${API}/trainee/alerts/${userId}`); }
  acknowledge(id: number): Observable<AlertResponse>                     { return this.http.patch<AlertResponse>(`${API}/trainee/alerts/${id}/acknowledge`, {}); }
  resolve(id: number): Observable<AlertResponse>                         { return this.http.patch<AlertResponse>(`${API}/trainee/alerts/${id}/resolve`, {}); }
}

/** DashboardService — summary stats for trainer and trainee home pages. */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private http: HttpClient) {}
  getTrainerDashboard(): Observable<DashboardStats>                      { return this.http.get<DashboardStats>(`${API}/trainer/dashboard`); }
  getTraineeDashboard(id: number): Observable<DashboardStats>            { return this.http.get<DashboardStats>(`${API}/trainee/dashboard`); }
}

/** TemplateService — download blank Excel templates for score/cohort uploads. */
@Injectable({ providedIn: 'root' })
export class TemplateService {
  constructor(private http: HttpClient) {}
  downloadScoreTemplate(): Observable<Blob> {
    return this.http.get(`${API}/template/score-upload`, { responseType: 'blob' });
  }
  downloadCohortTemplate(): Observable<Blob> {
    return this.http.get(`${API}/template/cohort-upload`, { responseType: 'blob' });
  }
}

/**
 * CohortUploadService — bulk-create/update trainees from an Excel file.
 * Excel columns: name | email | cohort | pod | phone (opt) | department (opt)
 */
@Injectable({ providedIn: 'root' })
export class CohortUploadService {
  constructor(private http: HttpClient) {}
  uploadCohort(file: File): Observable<CohortUploadResult> {
    const fd = new FormData(); fd.append('file', file);
    return this.http.post<CohortUploadResult>(`${API}/trainer/cohort/upload`, fd);
  }
}

/**
 * CohortManagementService — manage pod/cohort assignments for trainees.
 * Used by Pod Manager page and cohort structure view.
 */
@Injectable({ providedIn: 'root' })
export class CohortManagementService {
  constructor(private http: HttpClient) {}
  getStructure(): Observable<CohortStructure> {
    return this.http.get<CohortStructure>(`${API}/trainer/cohort/structure`);
  }
  getUnassigned(): Observable<CohortStudentInfo[]> {
    return this.http.get<CohortStudentInfo[]>(`${API}/trainer/cohort/unassigned`);
  }
  addTrainee(req: { fullName: string; email: string; phone?: string; department?: string; cohortName: string; podName: string }): Observable<CohortStudentInfo> {
    return this.http.post<CohortStudentInfo>(`${API}/trainer/cohort/add-trainee`, req);
  }
  assignStudent(userId: number, podName: string, cohortName: string): Observable<CohortStudentInfo> {
    return this.http.put<CohortStudentInfo>(`${API}/trainer/cohort/assign`, { userId, podName, cohortName });
  }
  removeFromPod(userId: number): Observable<void> {
    return this.http.delete<void>(`${API}/trainer/cohort/remove/${userId}`);
  }
  uploadBulk(file: File): Observable<CohortUploadResult> {
    const fd = new FormData(); fd.append('file', file);
    return this.http.post<CohortUploadResult>(`${API}/trainer/cohort/upload`, fd);
  }
}

