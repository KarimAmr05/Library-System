import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AppError } from '../../../core/http/app-error';
import { NotificationHubService } from '../../../core/realtime/notification-hub.service';
import { CardComponent } from '../../../shared/ui/card.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import { SpinnerComponent } from '../../../shared/ui/spinner.component';
import { NotificationsStore } from '../data/notifications.store';
import { NotificationItemComponent } from '../ui/notification-item.component';

type ReadFilter = 'all' | 'unread';

/** Smart page: notification inbox (REST history + live SignalR pushes). */
@Component({
  selector: 'app-notifications-inbox-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NotificationItemComponent,
    PaginationComponent,
    EmptyStateComponent,
    SpinnerComponent,
    CardComponent,
  ],
  template: `
    <header class="page-header">
      <div>
        <h1 class="page-title">Notifications</h1>
        <p class="page-subtitle">
          @if (live()) {
            <span class="live-indicator" aria-hidden="true"></span> Live — updates arrive instantly.
          } @else {
            Offline mode — notifications refresh on page load.
          }
        </p>
      </div>

      <div class="read-filter" role="group" aria-label="Filter notifications by read state">
        <button
          type="button"
          class="read-filter__btn"
          [class.read-filter__btn--active]="readFilter() === 'all'"
          [attr.aria-pressed]="readFilter() === 'all'"
          (click)="setReadFilter('all')"
        >
          All
        </button>
        <button
          type="button"
          class="read-filter__btn"
          [class.read-filter__btn--active]="readFilter() === 'unread'"
          [attr.aria-pressed]="readFilter() === 'unread'"
          (click)="setReadFilter('unread')"
        >
          Unread
        </button>
      </div>
    </header>

    @if (store.loading()) {
      <app-spinner label="Loading notifications" />
    } @else if (store.error(); as error) {
      <app-card>
        <app-empty-state
          icon="⚠️"
          title="Couldn't load notifications"
          [message]="safeMessage(error)"
        >
          <button type="button" class="cta cta--secondary" (click)="store.retry()">
            Try Again
          </button>
        </app-empty-state>
      </app-card>
    } @else if (store.isEmpty()) {
      <app-card>
        <app-empty-state
          icon="🔔"
          title="No notifications"
          message="You'll see borrowing updates and reminders here."
        />
      </app-card>
    } @else {
      <section aria-label="Notifications">
        <app-card [flat]="true">
          @for (notification of store.items(); track notification.id) {
            <app-notification-item
              [notification]="notification"
              [marking]="store.markingReadIds().has(notification.id)"
              (markAsRead)="store.markAsRead($event)"
            />
          }
        </app-card>
      </section>

      <app-pagination
        [currentPage]="store.page()"
        [totalPages]="store.totalPages()"
        [totalItems]="store.totalItems()"
        [pageSize]="store.pageSize()"
        (pageChange)="onPageChange($event)"
      />
    }
  `,
  styles: `
    .page-header {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: var(--space-3);
      margin-bottom: var(--space-6);
    }

    .page-title {
      font-size: var(--fs-2xl);
    }

    .page-subtitle {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      margin-top: var(--space-1);
      color: var(--color-neutral-500);
      font-size: var(--fs-sm);
    }

    .live-indicator {
      width: 0.5rem;
      height: 0.5rem;
      background: var(--color-success);
      border-radius: 50%;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.4;
      }
    }

    .read-filter {
      display: inline-flex;
      border: 1px solid var(--color-neutral-300);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .read-filter__btn {
      padding: var(--space-2) var(--space-4);
      font-size: var(--fs-sm);
      font-weight: var(--fw-medium);
      color: var(--color-neutral-600);
      background: var(--color-neutral-0);

      &:hover:not(:disabled) {
        background: var(--color-neutral-100);
      }

      &:focus-visible {
        outline-offset: -2px;
      }
    }

    .read-filter__btn--active {
      background: var(--color-primary-600);
      color: var(--color-neutral-0);

      &:hover:not(:disabled) {
        background: var(--color-primary-700);
      }
    }

    app-pagination {
      margin-top: var(--space-5);
    }

    .cta {
      display: inline-block;
      padding: var(--space-2) var(--space-4);
      background: var(--color-primary-600);
      color: var(--color-neutral-0);
      font-weight: var(--fw-semibold);
      border-radius: var(--radius-md);

      &:hover {
        background: var(--color-primary-700);
      }
    }

    .cta--secondary {
      background: var(--color-neutral-0);
      border: 1px solid var(--color-neutral-300);
      color: var(--color-neutral-700);

      &:hover {
        background: var(--color-neutral-100);
      }
    }
  `,
})
export class NotificationsInboxPageComponent {
  readonly store = inject(NotificationsStore);
  private readonly hub = inject(NotificationHubService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly readFilter = signal<ReadFilter>('all');

  /** Exposed for the live/offline status line in the template. */
  protected readonly live = () => this.hub.isConnected();

  ngOnInit(): void {
    // Real-time merge + reconnect refetch are wired once per inbox instance.
    this.store.connectRealtime();
    this.store.refreshBadgeCount();

    // Deep-link the read filter (?filter=unread).
    if (this.route.snapshot.queryParamMap.get('filter') === 'unread') {
      this.readFilter.set('unread');
      this.store.setFilter({ isRead: false });
    } else {
      this.store.load();
    }
  }

  protected setReadFilter(filter: ReadFilter): void {
    if (this.readFilter() === filter) {
      return;
    }
    this.readFilter.set(filter);
    this.store.setFilter({ isRead: filter === 'unread' ? false : undefined });
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: filter === 'unread' ? { filter } : {},
      replaceUrl: true,
    });
  }

  protected onPageChange(page: number): void {
    this.store.setPage(page);
  }

  protected safeMessage(error: AppError): string {
    return error.isClientFixable
      ? error.message
      : 'An unexpected problem occurred. Please try again.';
  }
}
