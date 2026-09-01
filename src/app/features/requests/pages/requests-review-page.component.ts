import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AppError } from '../../../core/http/app-error';
import { CardComponent } from '../../../shared/ui/card.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import { SpinnerComponent } from '../../../shared/ui/spinner.component';
import { RequestStatus } from '../../../shared/ui/status-badge.component';
import { BorrowingRequest } from '../data/borrowing-request.model';
import { RequestsStore } from '../data/requests.store';
import { DenyReasonDialogComponent } from '../ui/deny-reason-dialog.component';
import { RequestRowComponent } from '../ui/request-row.component';

const STATUS_OPTIONS: readonly (RequestStatus | '')[] = [
  '',
  'Pending',
  'Approved',
  'Denied',
  'Returned',
  'Expired',
];

/** Smart page: the admin review queue (/api/requests) with approve/deny. */
@Component({
  selector: 'app-requests-review-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RequestRowComponent,
    DenyReasonDialogComponent,
    SpinnerComponent,
    EmptyStateComponent,
    PaginationComponent,
    CardComponent,
  ],
  template: `
    <header class="page-header">
      <div>
        <h1 class="page-title">Review Requests</h1>
        <p class="page-subtitle">
          Approve or deny pending borrowing requests. {{ store.totalItems() }} total.
        </p>
      </div>

      <div class="status-filter">
        <label class="visually-hidden" for="status-filter">Filter by status</label>
        <select
          id="status-filter"
          class="status-filter__select"
          [value]="store.statusFilter() ?? ''"
          (change)="onStatusFilter($event)"
        >
          @for (option of statusOptions; track option) {
            <option [value]="option">{{ option === '' ? 'All statuses' : option }}</option>
          }
        </select>
      </div>
    </header>

    @if (store.loading()) {
      <app-spinner label="Loading requests" />
    } @else if (store.error(); as error) {
      <app-card>
        <app-empty-state icon="⚠️" title="Couldn't load requests" [message]="safeMessage(error)">
          <button type="button" class="cta cta--secondary" (click)="store.retry()">
            Try Again
          </button>
        </app-empty-state>
      </app-card>
    } @else if (store.isEmpty()) {
      <app-card>
        <app-empty-state
          icon="🗂️"
          title="No borrowing requests"
          message="Requests will appear here when users borrow books."
        />
      </app-card>
    } @else {
      <section aria-label="Borrowing requests for review">
        <app-card [flat]="true">
          @for (request of store.items(); track request.id) {
            <app-request-row
              [request]="request"
              [showActions]="true"
              [actionPending]="store.actionPendingId() === request.id"
              (approve)="approveRequest($event)"
              (deny)="openDenyDialog($event)"
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

    @if (denyTarget(); as target) {
      <app-deny-reason-dialog
        [requestTitle]="target.bookTitle"
        (confirmed)="confirmDeny($event)"
        (cancelled)="closeDenyDialog()"
      />
    }

    @if (actionError(); as message) {
      <div class="toast" role="alert">{{ message }}</div>
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
      margin-top: var(--space-1);
      color: var(--color-neutral-500);
      font-size: var(--fs-sm);
    }

    .status-filter__select {
      padding: var(--space-2) var(--space-3);
      background: var(--color-neutral-0);
      border: 1px solid var(--color-neutral-300);
      border-radius: var(--radius-md);
      font-size: var(--fs-sm);

      &:focus-visible {
        outline-offset: 0;
        border-color: var(--color-primary-500);
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

    .toast {
      position: fixed;
      inset-block-end: var(--space-5);
      inset-inline-start: 50%;
      transform: translateX(-50%);
      z-index: 400;
      max-width: min(100% - 2rem, 30rem);
      padding: var(--space-3) var(--space-5);
      background: var(--color-danger-bg);
      border: 1px solid rgba(220, 38, 38, 0.35);
      color: var(--status-denied-fg);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      font-size: var(--fs-sm);
    }
  `,
})
export class RequestsReviewPageComponent {
  readonly store = inject(RequestsStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly statusOptions = STATUS_OPTIONS;

  /** Request currently staged in the deny dialog. */
  protected readonly denyTarget = signal<BorrowingRequest | null>(null);

  /** Transient action failure shown via toast (incl. 409 conflicts). */
  protected readonly actionError = signal('');

  constructor() {
    this.store.configure('review');

    // Restore status/page from the URL for shareable review queues.
    const status = this.route.snapshot.queryParamMap.get('status');
    if (this.isValidStatus(status)) {
      this.store.setStatusFilter(status);
    } else {
      this.store.load();
    }
    const page = Number(this.route.snapshot.queryParamMap.get('page'));
    if (Number.isInteger(page) && page > 1) {
      this.store.setPage(page);
    }
  }

  private isValidStatus(value: string | null): value is RequestStatus {
    return (
      value === 'Pending' ||
      value === 'Approved' ||
      value === 'Denied' ||
      value === 'Returned' ||
      value === 'Expired'
    );
  }

  private syncStateToUrl(): void {
    const params: Record<string, string> = {};
    if (this.store.statusFilter()) {
      params['status'] = this.store.statusFilter()!;
    }
    if (this.store.page() > 1) {
      params['page'] = String(this.store.page());
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      replaceUrl: true,
    });
  }

  protected onStatusFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as RequestStatus | '';
    this.store.setStatusFilter(value === '' ? null : value);
    this.syncStateToUrl();
  }

  protected onPageChange(page: number): void {
    this.store.setPage(page);
    this.syncStateToUrl();
  }

  protected async approveRequest(id: string): Promise<void> {
    this.actionError.set('');
    try {
      await this.store.approve(id);
    } catch (error) {
      this.showActionError(error, 'Approval failed');
    }
  }

  protected openDenyDialog(request: BorrowingRequest): void {
    this.actionError.set('');
    this.denyTarget.set(request);
  }

  protected async confirmDeny(reason: string): Promise<void> {
    const target = this.denyTarget();
    if (!target) {
      return;
    }
    try {
      await this.store.deny(target.id, reason);
      this.closeDenyDialog();
    } catch (error) {
      this.showActionError(error, 'Denial failed');
      // Keep dialog open so the admin can adjust the reason and retry.
    }
  }

  protected closeDenyDialog(): void {
    this.denyTarget.set(null);
  }

  protected safeMessage(error: AppError): string {
    return error.isClientFixable
      ? error.message
      : 'An unexpected problem occurred. Please try again.';
  }

  private showActionError(error: unknown, prefix: string): void {
    const appError = error instanceof AppError ? error : null;
    // Surface backend business messages (409/422) directly — they explain
    // what to do next; hide technical details for everything else.
    const message =
      appError && appError.isClientFixable
        ? `${prefix}: ${appError.message}`
        : `${prefix}. The request list has been refreshed — please review its current state.`;
    this.actionError.set(message);
  }
}
