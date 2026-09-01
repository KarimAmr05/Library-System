import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Single source of truth for borrowing-request statuses across the app. */
export type RequestStatus = 'Pending' | 'Approved' | 'Denied' | 'Returned' | 'Expired';

interface StatusPresentation {
  label: string;
  icon: string;
  className: string;
}

const STATUS_PRESENTATION: Record<RequestStatus, StatusPresentation> = {
  Pending: { label: 'Pending', icon: '⏳', className: 'pending' },
  Approved: { label: 'Approved', icon: '✓', className: 'approved' },
  Denied: { label: 'Denied', icon: '✕', className: 'denied' },
  Returned: { label: 'Returned', icon: '↩', className: 'returned' },
  Expired: { label: 'Expired', icon: '◷', className: 'expired' },
};

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (presentation(); as p) {
      <span class="badge" [class]="'badge--' + p.className">
        <span aria-hidden="true" class="badge__icon">{{ p.icon }}</span>
        <span>{{ p.label }}</span>
      </span>
    }
  `,
  styles: `
    .badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-1) var(--space-3);
      border-radius: var(--radius-full);
      font-size: var(--fs-xs);
      font-weight: var(--fw-semibold);
      letter-spacing: 0.02em;
      white-space: nowrap;
    }

    .badge__icon {
      font-size: 0.85em;
    }

    .badge--pending {
      background: var(--status-pending-bg);
      color: var(--status-pending-fg);
      border: 1px solid rgba(217, 119, 6, 0.35);
    }

    .badge--approved {
      background: var(--status-approved-bg);
      color: var(--status-approved-fg);
      border: 1px solid rgba(22, 163, 74, 0.35);
    }

    .badge--denied {
      background: var(--status-denied-bg);
      color: var(--status-denied-fg);
      border: 1px solid rgba(220, 38, 38, 0.35);
    }

    .badge--returned {
      background: var(--status-returned-bg);
      color: var(--status-returned-fg);
      border: 1px solid rgba(37, 99, 235, 0.35);
    }

    .badge--expired {
      background: var(--status-expired-bg);
      color: var(--status-expired-fg);
      border: 1px solid rgba(71, 85, 105, 0.4);
    }
  `,
})
export class StatusBadgeComponent {
  /** Raw status value coming from the API (e.g. "Pending"). */
  readonly status = input<RequestStatus | null>(null);

  protected readonly presentation = computed<StatusPresentation | null>(() => {
    const status = this.status();
    return status && status in STATUS_PRESENTATION ? STATUS_PRESENTATION[status] : null;
  });
}
