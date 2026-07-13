import { Component } from '@angular/core';
/**
 * AppComponent — the root shell component.
 *
 * Workflow position: Bootstrapped by AppModule. Contains only a <router-outlet>
 * which renders either the LoginComponent (unauthenticated) or MainLayoutComponent (authenticated).
 */
@Component({ selector: 'app-root', template: '<router-outlet></router-outlet>' })
export class AppComponent {}
