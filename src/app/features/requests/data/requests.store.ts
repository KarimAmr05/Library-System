import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, EMPTY } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

import { AppError } from '../../../core/http/app-error';
import { AuthStore } from '../../../core/auth/auth.store';
import { RequestStatus } from '../../../shared/ui/status-badge.component';
import { BorrowingRequest, RequestsListQuery } from './borrowing-request.model';
import { RequestsApiService } from './requests-api.service';

const DEFAULT_PAGE_SIZE = 20;

/**
 * Signal-based view state for a borrowing-requests list.
 * One instance per view (provided per route): user history uses
 * `/api/requests/my`, the admin review queue uses `/api/requests`.
 */
@Injectable()
export class RequestsStore {
  private readonly api = inject(RequestsApiService);
  private readonly authStore = inject(AuthStore);

  private readonly _items = signal<BorrowingRequest[]>([]);
  private readonly _page = signal(1);
  private readonly _pageSize = signal(DEFAULT_PAGE_SIZE);
  private readonly _totalItems = signal(0);
  private readonly _statusFilter = signal<RequestStatus | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<AppError | null>(null);

  /** Tracks which request currently has an in-flight approve/deny action. */
  private readonly _actionPendingId = signal<string | null>(null);

  private requestId = 0;
  private mode: 'mine' | 'review' = 'mine';

  // ---- View bindings ----
  readonly items = this._items.asReadonly();
  readonly page = this._page.asReadonly();
  readonly pageSize = this._pageSize.asReadonly();
  readonly totalItems = this._totalItems.asReadonly();
  readonly totalPages = computed(() => Math.ceil(this._totalItems() / this._pageSize()));
  readonly statusFilter = this._statusFilter.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly actionPendingId = this._actionPendingId.asReadonly();
  readonly isEmpty = computed(
    () => !this._loading() && this._items().length === 0 && !this.error(),
  );

  /** Configures API target and scope. Must be called before load(). */
  configure(mode: 'mine' | 'review'): void {
    this.mode = mode;
  }

  load(page = this._page()): void {
    const request = ++this.requestId;
    this._loading.set(true);
    this._error.set(null);

    const query: RequestsListQuery = {
      page,
      pageSize: this._pageSize(),
      status: this._statusFilter() ?? undefined,
    };

    const result$ =
      this.mode === 'mine' ? this.api.getMyRequests(query) : this.api.getRequests(query);

    result$
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
        this._items.set(paged.items);
        this._totalItems.set(paged.totalItems);
        this._pageSize.set(paged.pageSize || DEFAULT_PAGE_SIZE);
        this._page.set(Math.min(paged.page, Math.max(1, paged.totalPages)));
      });
  }

  setPage(page: number): void {
    this.load(page);
  }

  setStatusFilter(status: RequestStatus | null): void {
    this._statusFilter.set(status);
    this.load(1);
  }

  retry(): void {
    this.load();
  }

  /**
   * Approves a pending request as the signed-in admin.
   * 409/422 responses are NOT retried — the caller surfaces them and the
   * list is refetched to reflect authoritative state.
   */
  approve(requestId: string, approvalNote?: string): Promise<void> {
    return this.decide(
      () => this.api.approve(requestId, this.approvePayload(approvalNote)),
      requestId,
    );
  }

  /** Denies with the required reason. Never retried on conflict. */
  deny(requestId: string, reason: string): Promise<void> {
    const adminId = this.requireAdminId();

    if (!adminId) {
      return Promise.reject(new Error('Administrator identity missing.'));
    }

    return this.decide(
      () => this.api.deny(requestId, { deniedByAdminId: adminId, reason }),
      requestId,
    );
  }

  private approvePayload(approvalNote?: string) {
    const adminId = this.requireAdminId();

    if (!adminId) {
      throw new Error('Administrator identity missing.');
    }

    return {
      approvedByAdminId: adminId,
      ...(approvalNote?.trim() ? { approvalNote: approvalNote.trim() } : {}),
    };
  }

  private requireAdminId(): string | null {
    const user = this.authStore.currentUser();
    return this.authStore.isAdmin() && user ? user.id : null;
  }

  private decide(action: () => Observable<BorrowingRequest>, requestId: string): Promise<void> {
    this._actionPendingId.set(requestId);

    return new Promise((resolve, reject) => {
      action()
        .pipe(finalize(() => this._actionPendingId.set(null)))
        .subscribe({
          // Refetch so the whole view reflects authoritative state.
          next: () => {
            this.load();
            resolve();
          },
          error: (error: AppError) => {
            // Refresh rows regardless of failure type — e.g. a 409 means the
            // request changed elsewhere and our copy may be stale.
            this.load();
            reject(error);
          },
        });
    });
  }
}
