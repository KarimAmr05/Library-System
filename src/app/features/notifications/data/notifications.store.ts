import { Injectable, computed, inject, signal } from '@angular/core';
import { EMPTY } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

import { AuthStore } from '../../../core/auth/auth.store';
import { AppError } from '../../../core/http/app-error';
import { NotificationsBadgeStore } from '../../../core/realtime/notifications-badge.store';
import { HubReconnectHandler } from '../../../core/realtime/hub-reconnect.handler';
import { NotificationHubService } from '../../../core/realtime/notification-hub.service';
import { PagedResult } from '../../../shared/models/paged-result.model';
import { Notification, NotificationsQuery } from './notification.model';
import { NotificationsApiService } from './notifications-api.service';

const DEFAULT_PAGE_SIZE = 20;

/**
 * Signal store for the notification inbox.
 *
 * Special responsibility: merges the two sources of truth —
 *  1. persisted REST history (GET /api/notifications), and
 *  2. real-time pushes (SignalR `notificationReceived`).
 *
 * It also keeps the Core badge store in sync with the current unread count,
 * honoring the mandated dependency direction
 * features/notifications → core/realtime.
 */
@Injectable()
export class NotificationsStore {
  private readonly api = inject(NotificationsApiService);
  private readonly authStore = inject(AuthStore);
  private readonly badge = inject(NotificationsBadgeStore);
  private readonly hub = inject(NotificationHubService);
  private readonly reconnectHandler = inject(HubReconnectHandler);

  private readonly _items = signal<Notification[]>([]);
  private readonly _page = signal(1);
  private readonly _pageSize = signal(DEFAULT_PAGE_SIZE);
  private readonly _totalItems = signal(0);
  private readonly _loading = signal(false);
  private readonly _error = signal<AppError | null>(null);

  /** Ids for which a mark-as-read call is currently in flight. */
  private readonly _markingReadIds = signal<ReadonlySet<string>>(new Set());

  private requestId = 0;
  private filters: NotificationsQuery = {};

  // ---- View bindings ----
  readonly items = this._items.asReadonly();
  readonly page = this._page.asReadonly();
  readonly pageSize = this._pageSize.asReadonly();
  readonly totalItems = this._totalItems.asReadonly();
  readonly totalPages = computed(() => Math.ceil(this._totalItems() / this._pageSize()));
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly markingReadIds = this._markingReadIds.asReadonly();
  readonly isEmpty = computed(
    () => !this._loading() && this._items().length === 0 && !this.error(),
  );
  readonly unreadOnPage = computed(() => this._items().filter((n) => !n.isRead).length);

  /** Wires real-time integration; called once when the inbox initializes. */
  connectRealtime(): void {
    // 1) Live pushes merge into local state and bump the badge.
    this.hub.notificationReceived$.subscribe((pushed) => {
      const incoming: Notification = {
        id: pushed.id,
        recipientUserId: pushed.recipientUserId,
        recipientRole: (pushed.recipientRole === 'Admin'
          ? 'Admin'
          : 'User') as Notification['recipientRole'],
        type: pushed.type as Notification['type'],
        title: pushed.title,
        message: pushed.message,
        isRead: pushed.isRead,
        createdAt: pushed.createdAt,
      };

      if (!this.isRelevantToCurrentScope(incoming)) {
        return;
      }

      if (this._page() === 1 && !this.filters.isRead) {
        // Newest-first inbox: prepend live items on the first page only.
        this._items.update((items) => [incoming, ...items]);
      }

      this.badge.increment();
    });

    // 2) After every hub reconnect, refetch persisted history to recover gaps.
    this.reconnectHandler.registerOnSync(() => {
      this.refreshBadgeCount();
      this.load();
    });
  }

  load(page = this._page()): void {
    const request = ++this.requestId;
    this._loading.set(true);
    this._error.set(null);

    const query: NotificationsQuery = {
      page,
      pageSize: this._pageSize(),
      ...this.filters,
    };

    this.api
      .getNotifications(query)
      .pipe(
        catchError((error: AppError) => {
          if (request === this.requestId) {
            this._error.set(error);
          }
          return EMPTY;
        }),
        finalize(() => {
          if (request === this.requestId) {
            this._loading.set(false);
          }
        }),
      )
      .subscribe((paged) => {
        if (request !== this.requestId) {
          return; // stale response
        }
        this.applyPage(paged);
      });
  }

  setFilter(patch: Partial<NotificationsQuery>): void {
    this.filters = { ...this.filters, ...patch };
    this.load(1);
  }

  setPage(page: number): void {
    this.load(page);
  }

  retry(): void {
    this.load();
  }

  /**
   * Marks one notification as read via REST, updates local state and the badge.
   */
  markAsRead(id: string): void {
    if (this._markingReadIds().has(id)) {
      return; // double-click protection
    }

    this._markingReadIds.update((ids) => new Set(ids).add(id));

    this.api.markAsRead(id).subscribe({
      next: (updated) => {
        const isRead = updated?.isRead ?? true;
        this._items.update((items) =>
          items.map((item) => (item.id === id ? { ...item, isRead } : item)),
        );
        // Only unread items expose a "mark as read" action, so one decrement
        // is always correct.
        this.badge.decrement();
        this.clearMarking(id);
      },
      error: () => {
        // Leave unread locally so the user can retry.
        this.clearMarking(id);
      },
    });
  }

  /** Recomputes unread count from REST (unread filter) after reconnects. */
  refreshBadgeCount(): void {
    this.api
      .getNotifications({ page: 1, pageSize: 1, isRead: false })
      .pipe(catchError(() => EMPTY))
      .subscribe((paged) => this.badge.setCount(paged.totalItems));
  }

  reset(): void {
    this.badge.reset();
    this._items.set([]);
    this._page.set(1);
    this._totalItems.set(0);
    this.filters = {};
  }

  // ---- internals ----

  private applyPage(paged: PagedResult<Notification>): void {
    this._items.set(paged.items);
    this._totalItems.set(paged.totalItems);
    this._pageSize.set(paged.pageSize || DEFAULT_PAGE_SIZE);
    this._page.set(Math.min(paged.page, Math.max(1, paged.totalPages)));
    this.syncBadgeFromLocalState();
  }

  private syncBadgeFromLocalState(): void {
    // Prefer server truth when available: query scoped to isRead=false yields
    // exact totals; otherwise derive from loaded pages conservatively.
    if ('isRead' in this.filters && typeof this.filters.isRead === 'boolean') {
      this.badge.setCount(this.filters.isRead ? 0 : this._totalItems());
      return;
    }
    // No explicit read filter: keep the badge from prior knowledge (don't clobber).
  }

  private isRelevantToCurrentScope(notification: Notification): boolean {
    // Current user receives their own pushes through the per-user group.
    const userId = this.authStore.currentUser()?.id;
    return (
      !userId ||
      notification.recipientUserId === '' ||
      notification.recipientUserId === userId ||
      notification.recipientRole === this.authStore.role()
    );
  }

  private clearMarking(id: string): void {
    this._markingReadIds.update((ids) => {
      const next = new Set(ids);
      next.delete(id);
      return next;
    });
  }
}
