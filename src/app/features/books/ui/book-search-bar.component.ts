import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { BookListFilters, BookSortField } from '../data/book.model';

/** Presentational search/filter bar. Emits filter patches; performs no HTTP. */
@Component({
  selector: 'app-book-search-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="search" (submit)="$event.preventDefault()">
      <div class="search__row">
        <div class="search__input-wrap">
          <span class="search__icon" aria-hidden="true">🔍</span>
          <label class="visually-hidden" for="book-search">Search books</label>
          <input
            id="book-search"
            class="search__input"
            type="search"
            placeholder="Search by title, author, or category…"
            autocomplete="off"
            [value]="filters().search"
            (input)="onSearch($event)"
          />
        </div>

        <div>
          <label class="visually-hidden" for="sort-by">Sort by</label>
          <select id="sort-by" class="search__control" (change)="onSortBy($event)">
            <option value="">Sort by</option>
            <option value="title" [selected]="filters().sortBy === 'title'">Title</option>
            <option value="author" [selected]="filters().sortBy === 'author'">Author</option>
            <option value="createdAt" [selected]="filters().sortBy === 'createdAt'">
              Recently added
            </option>
          </select>
        </div>

        <button
          type="button"
          class="search__control search__order"
          [disabled]="!hasSortField()"
          (click)="toggleOrder()"
          [attr.aria-label]="
            filters().sortOrder === 'asc'
              ? 'Switch to descending order'
              : 'Switch to ascending order'
          "
        >
          {{ filters().sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending' }}
        </button>
      </div>

      <label class="search__toggle">
        <input
          type="checkbox"
          [checked]="filters().availableOnly"
          (change)="onAvailableOnly($event)"
        />
        Show only available books
      </label>
    </form>
  `,
  styles: `
    .search {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .search__row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }

    .search__input-wrap {
      position: relative;
      flex: 1 1 16rem;
    }

    .search__icon {
      position: absolute;
      inset-block-start: 50%;
      inset-inline-start: var(--space-3);
      transform: translateY(-50%);
      font-size: var(--fs-sm);
      pointer-events: none;
    }

    .search__input {
      width: 100%;
      padding: var(--space-3) var(--space-8);
      background: var(--color-neutral-0);
      border: 1px solid var(--color-neutral-300);
      border-radius: var(--radius-md);
      transition: border-color var(--transition-fast);

      &:focus-visible {
        outline-offset: 0;
        border-color: var(--color-primary-500);
      }
    }

    .search__control {
      padding: var(--space-3);
      background: var(--color-neutral-0);
      border: 1px solid var(--color-neutral-300);
      border-radius: var(--radius-md);
      font-size: var(--fs-sm);

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &:focus-visible {
        outline-offset: 0;
        border-color: var(--color-primary-500);
      }
    }

    .search__order {
      white-space: nowrap;
    }

    .search__toggle {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--fs-sm);
      color: var(--color-neutral-600);
      user-select: none;

      input {
        width: 1rem;
        height: 1rem;
        accent-color: var(--color-primary-600);
      }
    }
  `,
})
export class BookSearchBarComponent {
  /** Current filter snapshot owned by the page/store. */
  readonly filters = input.required<BookListFilters>();

  readonly filterChange = output<Partial<BookListFilters>>();

  protected readonly hasSortField = computed(() => this.filters().sortBy !== null);

  protected onSearch(event: Event): void {
    this.filterChange.emit({ search: (event.target as HTMLInputElement).value.trim() });
  }

  protected onSortBy(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as BookSortField | '';
    this.filterChange.emit({ sortBy: value === '' ? null : value });
  }

  protected onAvailableOnly(event: Event): void {
    this.filterChange.emit({ availableOnly: (event.target as HTMLInputElement).checked });
  }

  protected toggleOrder(): void {
    this.filterChange.emit({ sortOrder: this.filters().sortOrder === 'asc' ? 'desc' : 'asc' });
  }
}
