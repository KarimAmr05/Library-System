import { Injectable, computed, inject, signal } from '@angular/core';
import { EMPTY } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

import { AppError } from '../../../core/http/app-error';
import { PagedResult } from '../../../shared/models/paged-result.model';
import {
  CreateUserRequest,
  ManagedUser,
  UsersQuery,
} from './user.model';
import { UsersApiService } from './users-api.service';

const DEFAULT_PAGE_SIZE = 20;

/**
 * Signal store for the admin user-management page.
 * Loads users from the backend (the single source of truth), applies role and
 * status changes, and surfaces success/error messages for the page toasts.
 */
@Injectable()
export class UsersStore {
  private readonly api = inject(UsersApiService);

  private readonly _items = signal<ManagedUser[]>([]);
  private readonly _page = signal(1);
  private readonly _pageSize = signal(DEFAULT_PAGE_SIZE);
  private readonly _totalItems = signal(0);
  private readonly _loading = signal(false);
  private readonly _error = signal<AppError | null>(null);
  private readonly _search = signal('');

  /** User ids with a role/status change currently in flight. */
  private readonly _busyIds = signal<ReadonlySet<string>>(new Set());

  /** True while the create-admin form submission is in flight. */
  private readonly _creating = signal(false);

  /** Transient toast messages (null hides the toast). */
  private readonly _successMessage = signal<string | null>(null);
  private readonly _actionError = signal<string | null>(null);

  private requestId = 0;

  // ---- View bindings ----
  readonly items = this._items.asReadonly();
  readonly page = this._page.asReadonly();
  readonly pageSize = this._pageSize.asReadonly();
  readonly totalItems = this._totalItems.asReadonly();
  readonly totalPages = computed(() => Math.ceil(this._totalItems() / this._pageSize()));
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly search = this._search.asReadonly();
  readonly busyIds = this._busyIds.asReadonly();
  readonly creating = this._creating.asReadonly();
  readonly successMessage = this._successMessage.asReadonly();
  readonly actionError = this._actionError.asReadonly();
  readonly isEmpty = computed(
    () => !this._loading() && this._items().length === 0 && !this.error(),
  );

  load(page = this._page()): void {
    const request = ++this.requestId;
    this._loading.set(true);
    this._error.set(null);

    const term = this._search().trim();
    const query: UsersQuery = {
      page,
      pageSize: this._pageSize(),
      ...(term ? { search: term } : {}),
    };

    this.api
      .getUsers(query)
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

  searchUsers(term: string): void {
    this._search.set(term);
    this.load(1);
  }

  setPage(page: number): void {
    this.load(page);
  }

  retry(): void {
    this.load();
  }

  /** Creates a new account with an explicit role (additional admins). */
  createUser(request: CreateUserRequest): void {
    if (this._creating()) {
      return;
    }

    this._creating.set(true);
    this._actionError.set(null);

    this.api.createUser(request).subscribe({
      next: (user) => {
        this._creating.set(false);
        this._successMessage.set(`${user.name} was created as ${user.role}.`);
        this.load(1);
      },
      error: (error: AppError) => {
        this._creating.set(false);
        this._actionError.set(
          error.message || 'The account could not be created.',
        );
      },
    });
  }

  /** Changes a user's role; the backend refuses removing the last admin. */
  updateUserRole(id: string, role: ManagedUser['role']): void {
    if (this.isBusy(id)) {
      return;
    }

    this.setBusy(id, true);
    this._actionError.set(null);

    this.api.updateUserRole(id, { role }).subscribe({
      next: (updated) => {
        this.replaceItem(updated);
        this.setBusy(id, false);
        this._successMessage.set(`${updated.name} is now ${updated.role}.`);
      },
      error: (error: AppError) => {
        this.setBusy(id, false);
        this.load(); // refetch authoritative state after a refused change
        this._actionError.set(
          error.message || "The role could not be changed.",
        );
      },
    });
  }

  /** Activates or deactivates an account. */
  updateUserStatus(id: string, isActive: boolean): void {
    if (this.isBusy(id)) {
      return;
    }

    this.setBusy(id, true);
    this._actionError.set(null);

    this.api.updateUserStatus(id, { isActive }).subscribe({
      next: (updated) => {
        this.replaceItem(updated);
        this.setBusy(id, false);
        this._successMessage.set(
          `${updated.name} was ${updated.isActive ? 'activated' : 'deactivated'}.`,
        );
      },
      error: (error: AppError) => {
        this.setBusy(id, false);
        this.load();
        this._actionError.set(
          error.message || "The account status could not be changed.",
        );
      },
    });
  }

  dismissSuccess(): void {
    this._successMessage.set(null);
  }

  dismissActionError(): void {
    this._actionError.set(null);
  }

  // ---- internals ----

  private isBusy(id: string): boolean {
    return this._busyIds().has(id);
  }

  private setBusy(id: string, busy: boolean): void {
    this._busyIds.update((ids) => {
      const next = new Set(ids);
      if (busy) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  private replaceItem(updated: ManagedUser): void {
    this._items.update((items) =>
      items.map((item) => (item.id === updated.id ? updated : item)),
    );
  }
}
