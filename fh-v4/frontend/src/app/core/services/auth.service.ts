import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { AuthResponse, LoginRequest } from '../../shared/models';
import { environment } from '../../../environments/environment';

/**
 * AuthService — manages authentication state in the Angular app.
 *
 * After a successful login:
 *  - The JWT token is stored in localStorage under 'fh_token'.
 *  - The full user object is stored under 'fh_user'.
 *  - A BehaviorSubject keeps the current user reactive (other components can subscribe).
 *
 * The JwtInterceptor reads 'fh_token' and adds it to every outgoing HTTP request.
 * On logout, localStorage is cleared and the user is redirected to /login.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = environment.apiUrl;
  /** Holds current user — emits null when logged out. */
  private userSubject = new BehaviorSubject<AuthResponse | null>(this.loadUser());
  currentUser$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

   login(req: LoginRequest): Observable<AuthResponse> {
     return this.http.post<AuthResponse>(`${this.API}/auth/login`, req).pipe(
       tap(res => {
         // Persist token and user profile to survive page refresh
         localStorage.setItem('fh_token', res.token);
         localStorage.setItem('fh_user', JSON.stringify(res));
         this.userSubject.next(res);
       })
     );
   }


  logout(): void {
    localStorage.removeItem('fh_token');
    localStorage.removeItem('fh_user');
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken():       string | null     { return localStorage.getItem('fh_token'); }
  getCurrentUser(): AuthResponse | null { return this.userSubject.value; }
  isLoggedIn():     boolean            { return !!this.getToken(); }
  getRole():        string             { return this.userSubject.value?.role ?? ''; }
  isTrainer():      boolean            { return this.getRole() === 'TRAINER'; }
  isTrainee():      boolean            { return this.getRole() === 'TRAINEE'; }

  /** Restores user from localStorage on app boot. */
  private loadUser(): AuthResponse | null {
    const u = localStorage.getItem('fh_user');
    return u ? JSON.parse(u) : null;
  }
}
