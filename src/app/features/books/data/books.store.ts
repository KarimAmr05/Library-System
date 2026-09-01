import { Injectable, computed, inject, signal } from '@angular/core';
import { EMPTY } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

import { AppError } from '../../../core/http/app-error';
import { PagedResult } from '../../../shared/models/paged-result.model';
import { Book, BookListFilters, BooksListQuery } from './book.model';
import { BooksApiService } from './books-api.service';

const DEFAULT_PAGE_SIZE = 20;

/**
 * Signal-based store for the books catalog view.
 * Coordinates the API service with the page's view state: items, pagination,
 * filters, loading and error indicators. Single owner of list state.
 */
@Injectable()
export class BooksStore {
  private readonly api = inject(BooksApiService);

  // ---- State ----
  private readonly _items = signal<Book[]>([]);
  private readonly _page = signal(1);
  private readonly _pageSize = signal(DEFAULT_PAGE_SIZE);
  private readonly _totalItems = signal(0);
  private readonly _filters = signal<BookListFilters>({
    search: '',
    availableOnly: false,
    sortBy: null,
    sortOrder: 'asc',
  });
  private readonly _loading = signal(false);
  private readonly _error = signal<AppError | null>(null);

  private requestId = 0;

  // ---- View bindings ----
  readonly items = this._items.asReadonly();
  readonly page = this._page.asReadonly();
  readonly pageSize = this._pageSize.asReadonly();
  readonly totalItems = this._totalItems.asReadonly();
  readonly totalPages = computed(() => Math.ceil(this._totalItems() / this._pageSize()));
  readonly filters = this._filters.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isEmpty = computed(
    () => !this._loading() && this._items().length === 0 && !this.error(),
  );

  /** Fetches the current page using current filters/pagination. */
  load(page = this._page()): void {
    const request = ++this.requestId;
    this._loading.set(true);
    this._error.set(null);

    const query: BooksListQuery = {
      page,
      pageSize: this._pageSize(),
      ...toApiFilters(this._filters()),
    };

    this.api
      .getBooks(query)
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
      .subscribe((result: PagedResult<Book>) => {
        if (request !== this.requestId) {
          return; // stale response
        }
        this._items.set(result.items);
        this._totalItems.set(result.totalItems);
        this._pageSize.set(result.pageSize || DEFAULT_PAGE_SIZE);
        // Clamp server-returned page (could differ when the page shrank).
        this._page.set(Math.min(result.page, Math.max(1, result.totalPages)));
      });
  }

  setPage(page: number): void {
    this.load(page);
  }

  /** Applies new filters and reloads from the first page. */
  setFilters(patch: Partial<BookListFilters>): void {
    this._filters.update((current) => ({ ...current, ...patch }));
    this.load(1);
  }

  retry(): void {
    this.load();
  }

  refresh(): void {
    this.load();
  }
}

function toApiFilters(
  filters: BookListFilters,
): Pick<BooksListQuery, 'search' | 'availableOnly' | 'sortBy' | 'sortOrder'> {
  return {
    search: filters.search || undefined,
    availableOnly: filters.availableOnly ? true : undefined,
    sortBy: filters.sortBy ?? undefined,
    sortOrder: filters.sortBy ? filters.sortOrder : undefined,
  };
}
