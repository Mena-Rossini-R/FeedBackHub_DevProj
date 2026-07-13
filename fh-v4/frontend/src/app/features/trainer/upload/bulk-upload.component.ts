import { Component } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ScoreService, CohortUploadService, TemplateService } from '../../../core/services/api.services';
import { ScoreResponse, BulkUploadResult, CohortUploadResult } from '../../../shared/models';

/**
 * BulkUploadComponent — trainer upload hub with two tabs.
 *
 * Scores tab: upload an Excel file where each row maps to one trainee score.
 *   The backend creates/updates Score records and auto-generates SkillAlerts
 *   for any score below 65%.
 *
 * Cohort tab: upload a roster Excel to bulk-create trainee accounts (or update
 *   existing ones with a new cohort/pod assignment). New accounts get the
 *   temporary password "password@123".
 *
 * Both tabs support drag-and-drop as well as the file-picker. Only .xlsx/.xls
 * files are accepted. Results (created/updated/error rows) are displayed inline
 * after each upload. Template download buttons let trainers get correctly
 * formatted starter files.
 */
@Component({
  selector: 'app-bulk-upload',
  templateUrl: './bulk-upload.component.html',
  styleUrls: ['./bulk-upload.component.scss']
})
export class BulkUploadComponent {
  // Scores tab
  scoreFile: File | null = null;
  scoreDragOver = false;
  scoreUploading = false;
  scoreResult: BulkUploadResult | null = null;

  // Cohort tab
  cohortFile: File | null = null;
  cohortDragOver = false;
  cohortUploading = false;
  cohortResult: CohortUploadResult | null = null;

  activeTab: 'scores' | 'cohort' = 'scores';

  displayedCols = ['traineeName','assignmentName','category','score','grade','weekLabel'];

  // Excel format guide
  scoreFormat = [
    { col: 'A', header: 'name', desc: 'Student full name', example: 'Ravi Kumar' },
    { col: 'B', header: 'email', desc: 'Student email (must exist in system)', example: 'ravi@fh.com' },
    { col: 'C', header: 'category', desc: 'Skill category', example: 'Technical' },
    { col: 'D', header: 'assignment', desc: 'Assignment name', example: 'Sprint Review W3' },
    { col: 'E', header: 'score', desc: 'Score (0–100)', example: '78' },
    { col: 'F', header: 'grade', desc: 'Grade (optional)', example: 'B+' },
    { col: 'G', header: 'weekLabel', desc: 'Week label (optional)', example: 'W3' },
  ];

  cohortFormat = [
    { col: 'A', header: 'name', desc: 'Student full name', example: 'Ravi Kumar' },
    { col: 'B', header: 'email', desc: 'Student email', example: 'ravi@company.com' },
    { col: 'C', header: 'cohort', desc: 'Cohort name', example: 'Cohort 12' },
    { col: 'D', header: 'pod', desc: 'Pod name', example: 'Pod A' },
    { col: 'E', header: 'phone', desc: 'Phone (optional)', example: '9876543210' },
    { col: 'F', header: 'department', desc: 'Department (optional)', example: 'Engineering' },
  ];

  constructor(private scoreSvc: ScoreService, private cohortSvc: CohortUploadService, private templateSvc: TemplateService, private snack: MatSnackBar) {}

  // ── Score upload ─────────────────────────────────────────────────────────
  onScoreDragOver(e: DragEvent):void { e.preventDefault(); this.scoreDragOver = true; }
  onScoreDragLeave():void { this.scoreDragOver = false; }
  onScoreDrop(e: DragEvent):void { e.preventDefault(); this.scoreDragOver = false; const f = e.dataTransfer?.files[0]; if(f) this.setScoreFile(f); }
  onScoreFileSelect(e: Event):void { const f=(e.target as HTMLInputElement).files?.[0]; if(f) this.setScoreFile(f); }

  setScoreFile(file: File):void {
    if (!this.validExt(file)) { this.snack.open('Only .xlsx or .xls files allowed','Close',{duration:4000}); return; }
    this.scoreFile = file; this.scoreResult = null;
  }

  uploadScores():void {
    if (!this.scoreFile) return;
    this.scoreUploading = true;
    this.scoreSvc.bulkUpload(this.scoreFile).subscribe({
      next: r => {
        this.scoreResult = r; this.scoreUploading = false;
        // Surface the counts so the trainer knows how many rows were processed.
        this.snack.open(`${r.successCount} scores imported, ${r.errorCount} errors`, 'Close', { duration: 5000 });
      },
      error: err => { this.scoreUploading = false; this.snack.open(err.error?.error ?? 'Upload failed','Close',{duration:4000}); }
    });
  }

  // ── Cohort upload ────────────────────────────────────────────────────────
  onCohortDragOver(e: DragEvent):void { e.preventDefault(); this.cohortDragOver = true; }
  onCohortDragLeave():void { this.cohortDragOver = false; }
  onCohortDrop(e: DragEvent):void { e.preventDefault(); this.cohortDragOver = false; const f = e.dataTransfer?.files[0]; if(f) this.setCohortFile(f); }
  onCohortFileSelect(e: Event):void { const f=(e.target as HTMLInputElement).files?.[0]; if(f) this.setCohortFile(f); }

  setCohortFile(file: File):void {
    if (!this.validExt(file)) { this.snack.open('Only .xlsx or .xls files allowed','Close',{duration:4000}); return; }
    this.cohortFile = file; this.cohortResult = null;
  }

  uploadCohort():void {
    if (!this.cohortFile) return;
    this.cohortUploading = true;
    this.cohortSvc.uploadCohort(this.cohortFile).subscribe({
      next: (r: any) => {
        this.cohortResult = r; this.cohortUploading = false;
        // createdCount = new accounts; updatedCount = existing accounts with updated pod/cohort.
        this.snack.open(`${r.createdCount} students created, ${r.updatedCount} updated`, 'Close', { duration: 5000 });
      },
      error: (err: any) => { this.cohortUploading = false; this.snack.open(err.error?.error ?? 'Upload failed','Close',{duration:4000}); }
    });
  }

  validExt(file: File): boolean {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    return ['xlsx','xls'].includes(ext);
  }
  formatSize(bytes: number): string { return (bytes/(1024*1024)).toFixed(1)+' MB'; }
  getScoreClass(s: number): string { return s>=75?'score-green':s>=65?'score-amber':'score-red'; }

  // Creates a temporary <a> to trigger the browser download, then cleans up the object URL.
  downloadScoreTemplate(): void {
    this.templateSvc.downloadScoreTemplate().subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'score-upload-template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  downloadCohortTemplate(): void {
    this.templateSvc.downloadCohortTemplate().subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cohort-upload-template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}
