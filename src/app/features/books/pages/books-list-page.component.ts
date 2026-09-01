import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AppError } from '../../../core/http/app-error';
import { BookListFilters } from '../data/book.model';
import { CardComponent } from '../../../shared/ui/card.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import { SpinnerComponent } from '../../../shared/ui/spinner.component';
import { BooksStore } from '../data/books.store';
import { BookCardComponent } from '../ui/book-card.component';
import { BookSearchBarComponent } from '../ui/book-search-bar.component';

/** Smart page: catalog browsing. Delegates all state to BooksStore. */
@Component({
  selector: 'app-books-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BookCardComponent,
    BookSearchBarComponent,
    SpinnerComponent,
    EmptyStateComponent,
    PaginationComponent,

    CardComponent,
  ],
  template: `
    <header class="page-header">
      <div>
        <h1 class="page-title">Library Catalog</h1>
        <p class="page-subtitle">Browse {{ store.totalItems() }} books in the collection.</p>
      </div>
    </header>

    <app-book-search-bar [filters]="store.filters()" (filterChange)="onFilterChange($event)" />

    @if (store.loading()) {
      <app-spinner label="Loading books" />
    } @else if (store.error(); as error) {
      <app-card>
        @if (error.status === 401 || error.status === 403) {
          <!-- 401/403 handled globally; render generic state here -->
          <app-empty-state icon="🔒" title="Access denied" [message]="safeMessage(error)" />
        } @else {
          <app-empty-state icon="⚠️" title="Couldn't load books" [message]="safeMessage(error)">
            <button app-button variant="secondary" (click)="store.retry()">Try Again</button>
          </app-empty-state>
        }
      </app-card>
    } @else if (store.isEmpty()) {
      <app-card>
        <app-empty-state
          title="No books found"
          message="Try adjusting your search terms or clearing the filters."
        />
      </app-card>
    } @else {
      <section aria-label="Book results" class="grid">
        @for (book of store.items(); track book.id) {
          <app-book-card [book]="book" />
        }
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

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
      gap: var(--space-4);
      margin-block: var(--space-6);
    }
  `,
})
export class BooksListPageComponent {
  readonly store = inject(BooksStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  constructor() {
    this.restoreStateFromUrl();
  }

  /** Hydrates filters/page from the URL so views are shareable and back/forward-safe. */
  private restoreStateFromUrl(): void {
    const q = this.route.snapshot.queryParamMap;
    const filters: Partial<BookListFilters> = {};

    const search = q.get('search');
    if (search) {
      filters.search = search;
    }
    if (q.get('available') === '1') {
      filters.availableOnly = true;
    }
    const sortBy = q.get('sortBy');
    if (sortBy === 'title' || sortBy === 'author' || sortBy === 'createdAt') {
      filters.sortBy = sortBy;
    }
    if (filters.sortBy && q.get('sortOrder') === 'desc') {
      filters.sortOrder = 'desc';
    }

    if (Object.keys(filters).length > 0) {
      this.store.setFilters(filters);
    } else {
      this.store.load();
    }

    const page = Number(q.get('page'));
    if (Number.isInteger(page) && page > 1) {
      this.store.setPage(page);
    }
  }

  /** Persists current filters/page into the query string (defaults omitted). */
  private syncStateToUrl(): void {
    const filters = this.store.filters();
    const params: Record<string, string> = {};

    if (filters.search) {
      params['search'] = filters.search;
    }
    if (filters.availableOnly) {
      params['available'] = '1';
    }
    if (filters.sortBy) {
      params['sortBy'] = filters.sortBy;
      if (filters.sortOrder !== 'asc') {
        params['sortOrder'] = filters.sortOrder;
      }
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

  protected onFilterChange(patch: Partial<BookListFilters>): void {
    this.store.setFilters(patch);
    this.syncStateToUrl();
  }

  protected onPageChange(page: number): void {
    this.store.setPage(page);
    this.syncStateToUrl();
  }

  protected safeMessage(error: AppError): string {
    return error.isClientFixable
      ? error.message
      : 'An unexpected problem occurred. Please try again.';
  }
}
