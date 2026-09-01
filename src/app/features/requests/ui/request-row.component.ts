import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CairoTimePipe } from '../../../shared/pipes/cairo-time.pipe';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge.component';
import { BorrowingRequest } from '../data/borrowing-request.model';

/**
 * Presentational row for a borrowing request; shared between the user
 * history and the admin review views.
 */
@Component({
  selector: 'app-request-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StatusBadgeComponent, RelativeTimePipe, CairoTimePipe],
  template: `
    <div class="row">
      <div class="row__main">
        <a class="row__title" [routerLink]="['/books', request().bookId]">
          {{ request().bookTitle }}
        </a>
        @if (request().denyReason; as reason) {
          <p class="row__reason">Denied: {{ reason }}</p>
        }
      </div>

      <dl class="row__meta">
        @if (showReviewer()) {
          <div class="row__meta-item">
            <dt>Requested</dt>
            <dd>
              {{ request().requestedAt | relativeTime }}
              <span class="row__meta-abs" [title]="request().requestedAt | cairoTime:'full'">
                {{ request().requestedAt | cairoTime }} Cairo
              </span>
            </dd>
          </div>
          <div class="row__meta-item">
            <dt>Reviewed</dt>
            <dd>
              @if (request().reviewedAt; as reviewedAt) {
                {{ reviewedAt | relativeTime }}
                <span class="row__meta-abs" [title]="reviewedAt | cairoTime:'full'">
                  {{ reviewedAt | cairoTime }} Cairo
                </span>
              } @else {
                —
              }
            </dd>
          </div>
        }
        <div class="row__meta-item">
          <dt>Period</dt>
          <dd>{{ request().borrowingPeriodDays }} days</dd>
        </div>
      </dl>

      <div class="row__status">
        <app-status-badge [status]="request().status" />
      </div>

      @if (showActions()) {
        <div class="row__actions">
          @if (request().status === 'Pending') {
            <button
              type="button"
              class="btn btn--approve"
              (click)="approve.emit(request().id)"
              [disabled]="actionPending()"
              aria-label="Approve borrow request for {{ request().bookTitle }}"
            >
              Approve
            </button>
            <button
              type="button"
              class="btn btn--deny"
              (click)="deny.emit(request())"
              [disabled]="actionPending()"
              aria-label="Deny borrow request for {{ request().bookTitle }}"
            >
              Deny
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-4);
      border-bottom: 1px solid var(--color-neutral-100);

      &:last-child {
        border-bottom: none;
      }
    }

    .row__main {
      flex: 1 1 12rem;
      min-width: 0;
    }

    .row__title {
      font-weight: var(--fw-semibold);
      color: var(--color-neutral-900);

      &:hover {
        color: var(--color-primary-600);
      }
    }

    .row__reason {
      margin-top: var(--space-1);
      font-size: var(--fs-xs);
      color: var(--status-denied-fg);
      display: -webkit-box;
      -webkit-box-orient: vertical;
      line-clamp: 2;
      -webkit-line-clamp: 2;
      overflow: hidden;
    }

    .row__meta {
      display: flex;
      gap: var(--space-5);
      margin: 0;
    }

    .row__meta-item dt {
      font-size: var(--fs-xs);
      color: var(--color-neutral-500);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .row__meta-item dd {
      margin: 0;
      font-size: var(--fs-sm);
      color: var(--color-neutral-800);
    }

    .row__meta-abs {
      display: block;
      font-size: var(--fs-xs);
      color: var(--color-neutral-500);
      font-variant-numeric: tabular-nums;
    }

    .row__status {
      flex-shrink: 0;
    }

    .row__actions {
      display: flex;
      gap: var(--space-2);
    }

    .btn {
      padding: var(--space-1) var(--space-3);
      border-radius: var(--radius-md);
      font-size: var(--fs-xs);
      font-weight: var(--fw-semibold);
      transition:
        background-color var(--transition-fast),
        opacity var(--transition-fast);

      &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
    }

    .btn--approve {
      background: var(--color-success-bg);
      border: 1px solid rgba(22, 163, 74, 0.35);
      color: var(--status-approved-fg);

      &:hover:not(:disabled) {
        background: var(--color-success);
        color: var(--color-neutral-0);
      }
    }

    .btn--deny {
      background: var(--color-danger-bg);
      border: 1px solid rgba(220, 38, 38, 0.35);
      color: var(--status-denied-fg);

      &:hover:not(:disabled) {
        background: var(--color-danger);
        color: var(--color-neutral-0);
      }
    }
  `,
})
export class RequestRowComponent {
  readonly request = input.required<BorrowingRequest>();
  /** Enables admin decision buttons (review screen only). */
  readonly showActions = input(false, { transform: (v: boolean | undefined) => v ?? false });
  readonly actionPending = input(false, { transform: (v: boolean | undefined) => v ?? false });

  readonly approve = output<string>();
  readonly deny = output<BorrowingRequest>();

  protected showReviewer(): boolean {
    const status = this.request().status;
    return status !== 'Pending';
  }
}
