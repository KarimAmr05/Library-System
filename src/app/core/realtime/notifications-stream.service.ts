import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { APP_CONFIG } from '../config/app-config.token';
import { NotificationHubService } from './notification-hub.service';
import { NotificationsBadgeStore } from './notifications-badge.store';

/** Minimal shape of the paged notifications response used for the badge. */
interface UnreadCountPage {
  readonly totalItems: number;
}

/**
 * Application-wide real-time notification integration.
 *
 * Lives outside the notifications page so pushed notifications update the
 * header badge immediately on ANY route, and the unread count is loaded once
 * per session without visiting /notifications. The inbox page merges pushes
 * into its list via the same hub stream — badge increments happen ONLY here
 * to avoid double counting.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsStreamService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);
  private readonly hub = inject(NotificationHubService);
  private readonly badge = inject(NotificationsBadgeStore);

  constructor() {
    // Live pushes bump the unread badge on every route, instantly.
    this.hub.notificationReceived$.subscribe(() => this.badge.increment());
  }

  /**
   * Called when a session becomes active (login or restored session):
   * seeds the unread count from the database so the badge reflects
   * notifications that arrived while the user was offline.
   */
  startSession(): void {
    this.refreshUnreadCount();
  }

  /** Reloads the unread count from the API (REST remains the source of truth). */
  refreshUnreadCount(): void {
    this.http
      .get<UnreadCountPage>(`${this.config.apiUrl}/notifications`, {
        params: { page: '1', pageSize: '1', isRead: 'false' },
      })
      .pipe(catchError(() => EMPTY))
      .subscribe((page) => this.badge.setCount(page?.totalItems ?? 0));
  }

  /** Called on logout so a stale count never leaks into the next session. */
  reset(): void {
    this.badge.reset();
  }
}
