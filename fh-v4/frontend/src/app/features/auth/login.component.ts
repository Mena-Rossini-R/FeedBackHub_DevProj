// features/auth/login.component.ts
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';

@Component({ selector: 'app-login', templateUrl: './login.component.html', styleUrls: ['./login.component.scss'] })
export class LoginComponent {
  form: FormGroup;
  loading = false;
  hide = true;

  demoAccounts = [
    { label: 'Trainer', email: 'trainer@fh.com', password: 'password', color: '#2A70B2' },
    { label: 'Trainee', email: 'ravi@fh.com',    password: 'password', color: '#12987A' },
  ];

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router, private snack: MatSnackBar) {
    this.form = this.fb.group({ email: ['', [Validators.required, Validators.email]], password: ['', Validators.required] });
  }

  fill(acc: any): void { this.form.patchValue({ email: acc.email, password: acc.password }); }

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.auth.login(this.form.value).subscribe({
      next: (res) => this.router.navigate([res.role === 'TRAINER' ? '/trainer/dashboard' : '/trainee/dashboard']),
      error: (err) => { this.loading = false; this.snack.open(err.error?.error ?? 'Login failed', 'Close', { duration: 4000 }); }
    });
  }
}
