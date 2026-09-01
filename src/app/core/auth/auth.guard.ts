import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthStore } from './auth.store';
import { UserRole } from './auth.models';

/**
 * Route guards for role-based access control.
 * Frontend checks are UX only — the backend remains the security authority.
 */

/** Requires any authenticated user. Unauthenticated visitors go to /login. */
export function requireAuth(): CanActivateFn {
  return () => {
    const authStore = inject(AuthStore);
    const router = inject(Router);

    if (authStore.isAuthenticated()) {
      return true;
    }

    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: router.getCurrentNavigation()?.finalUrl?.toString() ?? '/' },
    });
  };
}

/** Requires a specific role; wrong-role users land on their default page. */
export function requireRole(...roles: UserRole[]): CanActivateFn {
  return () => {
    const authStore = inject(AuthStore);
    const router = inject(Router);

    if (!authStore.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }

    const role = authStore.role();
    return role && roles.includes(role) ? true : router.createUrlTree(['/books']);
  };
}

/** Admin-only routes. */
export const requireAdmin: CanActivateFn = requireRole('Admin');

/** User-only routes (e.g. /requests/my). */
export const requireUser: CanActivateFn = requireRole('User');

/** Prevents authenticated users from visiting /login again. */
export const guestOnly = (): CanActivateFn => {
  return () => {
    const authStore = inject(AuthStore);
    const router = inject(Router);

    return authStore.isAuthenticated() ? router.createUrlTree(['/books']) : true;
  };
};
