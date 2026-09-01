import { Routes } from '@angular/router';

import { guestOnly } from './core/auth/auth.guard';

/**
 * Top-level routes only: lazy feature loading plus the guest-only auth pages.
 * Feature-owned routes live in their respective feature folders
 * (see features/books, features/requests, features/notifications).
 */
export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestOnly],
    loadComponent: () =>
      import('./core/auth/login-page.component').then((m) => m.LoginPageComponent),
    title: 'Sign in — Library System',
  },
  {
    path: 'forgot-password',
    canActivate: [guestOnly],
    loadComponent: () =>
      import('./core/auth/forgot-password-page.component').then(
        (m) => m.ForgotPasswordPageComponent,
      ),
    title: 'Reset password — Library System',
  },
  {
    path: 'reset-password',
    canActivate: [guestOnly],
    loadComponent: () =>
      import('./core/auth/reset-password-page.component').then((m) => m.ResetPasswordPageComponent),
    title: 'Choose a new password — Library System',
  },
  {
    path: 'books',
    loadChildren: () => import('./features/books/books.routes').then((m) => m.BOOKS_ROUTES),
  },
  {
    path: 'requests',
    loadChildren: () =>
      import('./features/requests/requests.routes').then((m) => m.REQUESTS_ROUTES),
  },
  {
    path: 'notifications',
    loadChildren: () =>
      import('./features/notifications/notifications.routes').then((m) => m.NOTIFICATIONS_ROUTES),
  },
  { path: '', pathMatch: 'full', redirectTo: 'books' },
  { path: '**', redirectTo: 'books' },
];
