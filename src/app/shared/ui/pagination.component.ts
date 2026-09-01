import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/**
 * Page-based pagination control matching the API contract
 * (1-based pages, page/pageSize/totalItems/totalPages).
 * Shared because all three list features use identical pagination semantics.
 */
@Component({
  selector: 'app-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (totalPages() > 0) {
      <nav class="pager" aria-label="Pagination">
        <p class="pager__summary" aria-live="polite">
          {{ rangeStart() }}–{{ rangeEnd() }} of {{ totalItems() }}
        </p>

        <div class="pager__controls">
          <button
            type="button"
            class="pager__page"
            [disabled]="currentPage() <= 1"
            (click)="goTo(currentPage() - 1)"
            aria-label="Previous page"
          >
            ‹
          </button>

          @for (p of visiblePages(); track p) {
            <button
              type="button"
              class="pager__page"
              [class.pager__page--active]="p === currentPage()"
              [disabled]="p === ELLIPSIS || p === currentPage()"
              [attr.aria-current]="p === currentPage() ? 'page' : null"
              [attr.aria-label]="p === ELLIPSIS ? '' : 'Page ' + p"
              (click)="goTo(p)"
            >
              {{ p === ELLIPSIS ? '…' : p }}
            </button>
          }

          <button
            type="button"
            class="pager__page"
            [disabled]="currentPage() >= totalPages()"
            (click)="goTo(currentPage() + 1)"
            aria-label="Next page"
          >
            ›
          </button>
        </div>
      </nav>
    }
  `,
  styles: `
    .pager {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
    }

    .pager__summary {
      font-size: var(--fs-sm);
      color: var(--color-neutral-500);
    }

    .pager__controls {
      display: flex;
      gap: var(--space-1);
    }

    .pager__page {
      display: grid;
      place-items: center;
      min-width: 2.25rem;
      height: 2.25rem;
      padding: 0 var(--space-2);
      font-size: var(--fs-sm);
      color: var(--color-neutral-700);
      background: var(--color-neutral-0);
      border: 1px solid var(--color-neutral-300);
      border-radius: var(--radius-md);
      transition:
        background-color var(--transition-fast),
        border-color var(--transition-fast);

      &:hover:not(:disabled) {
        background: var(--color-primary-50);
        border-color: var(--color-primary-400);
      }

      &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
    }

    .pager__page--active {
      background: var(--color-primary-600);
      border-color: var(--color-primary-600);
      color: var(--color-neutral-0);
      cursor: default;

      &:hover:not(:disabled) {
        background: var(--color-primary-600);
      }
    }
  `,
})
export class PaginationComponent {
  private static readonly MAX_VISIBLE = 7;
  readonly ELLIPSIS = -1;

  readonly currentPage = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly totalItems = input.required<number>();
  readonly pageSize = input.required<number>();

  readonly pageChange = output<number>();

  protected readonly rangeStart = computed(() =>
    this.totalItems() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1,
  );

  protected readonly rangeEnd = computed(() =>
    Math.min(this.currentPage() * this.pageSize(), this.totalItems()),
  );

  protected readonly visiblePages = computed<number[]>(() => {
    const total = Math.min(this.totalPages(), Number.MAX_SAFE_INTEGER);
    const current = this.currentPage();
    const max = PaginationComponent.MAX_VISIBLE;

    if (total <= max) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages = new Set<number>([1, total, current]);

    for (const offset of [-1, 1]) {
      const neighbor = current + offset;
      if (neighbor > 1 && neighbor < total) {
        pages.add(neighbor);
      }
    }

    const sorted = [...pages].sort((a, b) => a - b);
    const result: number[] = [];

    sorted.forEach((page, index) => {
      if (index > 0 && page - sorted[index - 1] > 1) {
        result.push(this.ELLIPSIS);
      }
      result.push(page);
    });

    return result.slice(0, max);
  });

  protected goTo(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.pageChange.emit(page);
    }
  }
}
