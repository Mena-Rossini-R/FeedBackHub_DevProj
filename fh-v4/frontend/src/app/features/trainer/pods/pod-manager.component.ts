import { Component, OnInit } from '@angular/core';
import { ScoreService } from '../../../core/services/api.services';
import { ScoreResponse } from '../../../shared/models';

interface PodStudent {
  name: string; email: string; avg: number; trend: string;
  count: number; scores: ScoreResponse[]; catAvgs: Record<string, number>;
}
interface Pod {
  name: string; avg: number; count: number; color: string;
  status: string; students: PodStudent[];
}

/**
 * PodManagerComponent — trainer's pod/cohort management and performance view.
 *
 * Workflow position: Accessible from trainer sidebar nav → "Pods".
 * Shows each pod's average score, number of trainees, and at-risk count.
 * Trainer can reassign trainees between pods and add/remove cohort members.
 * Uses CohortService for pod data and DashboardService for pod averages.
 */
@Component({
  selector: 'app-pod-manager',
  templateUrl: './pod-manager.component.html',
  styleUrls: ['./pod-manager.component.scss']
})
export class PodManagerComponent implements OnInit {
  loading = true;
  pods: Pod[] = [];
  selectedPod: Pod | null = null;
  selectedStudent: PodStudent | null = null;

  constructor(private scoreSvc: ScoreService) {}

  ngOnInit(): void {
    this.scoreSvc.getTrainerScores().subscribe({
      next: s => { this.buildPods(s); this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  buildPods(scores: ScoreResponse[]): void {
    const podMap: Record<string, ScoreResponse[]> = {};
    for (const s of scores) {
      if (s.podName) {
        if (!podMap[s.podName]) podMap[s.podName] = [];
        podMap[s.podName].push(s);
      }
    }
    const colors = ['#2A70B2','#059669','#D97706','#DC2626','#6838A8','#0891B2'];
    this.pods = Object.entries(podMap).map(([name, sc], i) => {
      const stuMap: Record<string, ScoreResponse[]> = {};
      for (const s of sc) {
        if (!stuMap[s.traineeEmail]) stuMap[s.traineeEmail] = [];
        stuMap[s.traineeEmail].push(s);
      }
      const students = Object.entries(stuMap).map(([email, ss]) => {
        const avg = Math.round(ss.reduce((a, b) => a + b.score, 0) / ss.length);
        const cats: Record<string, number[]> = {};
        for (const s of ss) {
          if (!cats[s.category]) cats[s.category] = [];
          cats[s.category].push(s.score);
        }
        const catAvgs: Record<string, number> = {};
        for (const [c, v] of Object.entries(cats))
          catAvgs[c] = Math.round(v.reduce((a, b) => a + b, 0) / v.length);
        const sorted = [...ss].sort((a, b) => new Date(a.submittedDate).getTime() - new Date(b.submittedDate).getTime());
        const trend = sorted.length >= 2
          ? (sorted[sorted.length-1].score > sorted[0].score ? 'UP'
           : sorted[sorted.length-1].score < sorted[0].score ? 'DOWN' : 'STABLE')
          : 'STABLE';
        return { name: ss[0].traineeName, email, avg, scores: ss, catAvgs, trend, count: ss.length };
      });
      const avg = Math.round(sc.reduce((a, b) => a + b.score, 0) / sc.length);
      return { name, avg, count: students.length, color: colors[i % colors.length],
               status: avg >= 80 ? 'Active' : avg >= 60 ? 'At Risk' : 'Critical', students };
    });
  }

  selectPod(pod: Pod): void { this.selectedPod = pod; this.selectedStudent = null; }
  selectStudent(s: PodStudent): void { this.selectedStudent = s; }
  back(): void {
    if (this.selectedStudent) this.selectedStudent = null;
    else this.selectedPod = null;
  }

  get weakCategories(): string[] {
    if (!this.selectedStudent) return [];
    return Object.entries(this.selectedStudent.catAvgs)
      .filter(([, v]) => (v as number) < 70).map(([k]) => k);
  }

  getScoreColor(s: number): string { return s >= 80 ? '#059669' : s >= 60 ? '#D97706' : '#DC2626'; }
  getTrendIcon(t: string): string  { return t === 'UP' ? 'trending_up' : t === 'DOWN' ? 'trending_down' : 'trending_flat'; }
  getTrendColor(t: string): string { return t === 'UP' ? '#059669' : t === 'DOWN' ? '#DC2626' : '#94A3B8'; }
  initials(name: string): string   { return name ? name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() : '?'; }
  firstName(name: string): string  { return name ? name.split(' ')[0] : ''; }
  catEntries(catAvgs: Record<string,number>): {key:string;value:number}[] {
    if (!catAvgs) return [];
    return Object.entries(catAvgs).map(([key, value]) => ({ key, value: Number(value) }));
  }
  catBg(v: number): string    { return v >= 80 ? '#DCFCE7' : v >= 60 ? '#FEF3C7' : '#FEE2E2'; }
  catColor(v: number): string { return v >= 80 ? '#059669' : v >= 60 ? '#D97706' : '#DC2626'; }
  getAtRiskCount(pod: Pod): number { return pod?.students?.filter(s => s.avg < 65).length ?? 0; }
  getTopScore(pod: Pod): number    { return pod?.students?.length ? Math.max(...pod.students.map(s => s.avg)) : 0; }
  getLowestScore(pod: Pod): number { return pod?.students?.length ? Math.min(...pod.students.map(s => s.avg)) : 0; }
  getCatScore(cat: string): number {
    if (!this.selectedStudent) return 0;
    return this.selectedStudent.catAvgs[cat] ?? 0;
  }
}
