import { Routes } from '@angular/router';

import { requireAuth } from '../../core/auth/auth.guard';
import { NotificationsStore } from './data/notifications.store';

/** Notifications inbox — available to any authenticated user. */
export const NOTIFICATIONS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [requireAuth()],
    providers: [NotificationsStore],
    title: 'Notifications — Library System',
    loadComponent: () =>
      import('./pages/notifications-inbox-page.component').then(
        (m) => m.NotificationsInboxPageComponent,
      ),
  },
];
