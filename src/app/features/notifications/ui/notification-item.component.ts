import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { CairoTimePipe } from '../../../shared/pipes/cairo-time.pipe';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { Notification } from '../data/notification.model';

const TYPE_META: Record<string, { icon: string; label: string }> = {
  BorrowRequestCreated: { icon: '📨', label: 'New request' },
  BorrowDueReminder: { icon: '⏰', label: 'Due reminder' },
  RequestApproved: { icon: '✅', label: 'Approved' },
  RequestDenied: { icon: '❌', label: 'Denied' },
};

/** Presentational inbox item. Inputs in, outputs out; no API calls. */
@Component({
  selector: 'app-notification-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RelativeTimePipe, CairoTimePipe],
  template: `
    <article
      class="item"
      [class.item--unread]="!notification().isRead"
      tabindex="0"
      [attr.aria-label]="ariaLabel()"
    >
      <span class="item__icon" aria-hidden="true">{{ meta().icon }}</span>

      <div class="item__body">
        <div class="item__heading">
          <span class="item__type">{{ meta().label }}</span>
          <time
            class="item__time"
            [attr.datetime]="notification().createdAt"
            [title]="notification().createdAt | cairoTime:'full'"
          >
            {{ notification().createdAt | relativeTime }} · {{ notification().createdAt | cairoTime }}
          </time>
        </div>
        <p class="item__title">{{ notification().title }}</p>
        <p class="item__message">{{ notification().message }}</p>
      </div>

      @if (!notification().isRead) {
        <button
          type="button"
          class="item__mark-read"
          (click)="markAsRead.emit(notification().id)"
          [disabled]="marking()"
        >
          {{ marking() ? 'Marking…' : 'Mark as Read' }}
        </button>
      } @else {
        <span class="item__read" aria-hidden="true">✓</span>
      }
    </article>
  `,
  styles: `
    .item {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      padding: var(--space-4);
      border-bottom: 1px solid var(--color-neutral-100);

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background: var(--color-neutral-50);
      }
    }

    .item--unread {
      background: var(--color-primary-50);

      &:hover {
        background: var(--color-primary-100);
      }
    }

    .item__icon {
      display: grid;
      place-items: center;
      width: 2.5rem;
      height: 2.5rem;
      flex-shrink: 0;
      font-size: var(--fs-lg);
      background: var(--color-neutral-100);
      border-radius: var(--radius-full);
    }

    .item--unread .item__icon {
      background: var(--color-primary-200);
    }

    .item__body {
      flex: 1;
      min-width: 0;
    }

    .item__heading {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--space-3);
    }

    .item__type {
      font-size: var(--fs-xs);
      font-weight: var(--fw-semibold);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--color-primary-600);
    }

    .item__time {
      flex-shrink: 0;
      font-size: var(--fs-xs);
      color: var(--color-neutral-500);
    }

    .item__title {
      margin-top: var(--space-1);
      font-weight: var(--fw-semibold);
      color: var(--color-neutral-900);
      font-size: var(--fs-sm);
    }

    .item__message {
      margin-top: var(--space-1);
      font-size: var(--fs-sm);
      color: var(--color-neutral-600);
    }

    .item__mark-read {
      flex-shrink: 0;
      padding: var(--space-1) var(--space-3);
      border: 1px solid var(--color-neutral-300);
      border-radius: var(--radius-md);
      background: var(--color-neutral-0);
      color: var(--color-primary-600);
      font-size: var(--fs-xs);
      font-weight: var(--fw-medium);

      &:hover:not(:disabled) {
        border-color: var(--color-primary-500);
      }

      &:disabled {
        opacity: 0.6;
      }
    }

    .item__read {
      flex-shrink: 0;
      color: var(--status-approved-fg);
      font-size: var(--fs-sm);
    }
  `,
})
export class NotificationItemComponent {
  readonly notification = input.required<Notification>();
  readonly marking = input(false, { transform: (v: boolean | undefined) => v ?? false });

  readonly markAsRead = output<string>();

  protected readonly meta = computed(
    () => TYPE_META[this.notification().type] ?? { icon: '🔔', label: 'Notification' },
  );

  protected readonly ariaLabel = computed(() => {
    const n = this.notification();
    return `${n.isRead ? 'Read' : 'Unread'} ${n.type} notification: ${n.title}. ${n.message}`;
  });
}
