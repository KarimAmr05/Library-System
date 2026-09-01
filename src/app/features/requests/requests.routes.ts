import { Routes } from '@angular/router';

import { requireAdmin, requireUser } from '../../core/auth/auth.guard';
import { RequestsStore } from './data/requests.store';

/**
 * Borrowing-requests routes. ONE domain, two role-gated views.
 * Each route subtree gets its own RequestsStore instance so the user's
 * history and the admin review queue never share state.
 */
export const REQUESTS_ROUTES: Routes = [
  {
    path: 'my',
    canActivate: [requireUser],
    providers: [RequestsStore],
    title: 'My borrowing requests — Library System',
    loadComponent: () =>
      import('./pages/my-requests-page.component').then((m) => m.MyRequestsPageComponent),
  },
  {
    path: '',
    canActivate: [requireAdmin],
    providers: [RequestsStore],
    title: 'Review requests — Library System',
    loadComponent: () =>
      import('./pages/requests-review-page.component').then((m) => m.RequestsReviewPageComponent),
  },
];
