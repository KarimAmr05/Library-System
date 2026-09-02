import { Routes } from '@angular/router';

import { requireAdmin } from '../../core/auth/auth.guard';
import { UsersStore } from './data/users.store';

/**
 * Admin user management — Admin role required.
 * Frontend guards are UX only: the backend endpoints are separately
 * authorized with [Authorize(Roles = "Admin")].
 */
export const USERS_ROUTES: Routes = [
  {
    path: 'users',
    canActivate: [requireAdmin],
    providers: [UsersStore],
    title: 'User Management — Library System',
    loadComponent: () =>
      import('./pages/users-management-page.component').then(
        (m) => m.UsersManagementPageComponent,
      ),
  },
];
