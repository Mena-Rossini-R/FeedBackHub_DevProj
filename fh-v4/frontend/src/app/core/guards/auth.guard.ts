import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * AuthGuard — protects routes from unauthenticated or unauthorised users.
 *
 * Workflow position: Applied to all routes except /login in AppRoutingModule.
 * Checks AuthService.isLoggedIn() — redirects to /login if not authenticated.
 * Role-based check: if a route has data.role, verifies the logged-in user has that role.
 */
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}
  canActivate(route: ActivatedRouteSnapshot): boolean {
    if (!this.auth.isLoggedIn()) { this.router.navigate(['/login']); return false; }
    const roles: string[] = route.data['roles'] ?? [];
    if (roles.length && !roles.includes(this.auth.getRole())) {
      this.router.navigate([this.auth.isTrainer() ? '/trainer/dashboard' : '/trainee/dashboard']);
      return false;
    }
    return true;
  }
}
