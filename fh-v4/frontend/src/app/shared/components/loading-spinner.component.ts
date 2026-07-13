// src/app/shared/components/loading-spinner.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  template: `
    <div style="display:flex;justify-content:center;align-items:center;padding:48px">
      <mat-spinner diameter="40"></mat-spinner>
    </div>`
})
export class LoadingSpinnerComponent {}
