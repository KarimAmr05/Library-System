import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AppError } from '../../../core/http/app-error';
import { CardComponent } from '../../../shared/ui/card.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import { SpinnerComponent } from '../../../shared/ui/spinner.component';
import { RequestsStore } from '../data/requests.store';
import { RequestRowComponent } from '../ui/request-row.component';

/** Smart page: the signed-in user's borrowing history (/api/requests/my). */
@Component({
  selector: 'app-my-requests-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RequestRowComponent,
    RouterLink,
    SpinnerComponent,
    EmptyStateComponent,
    PaginationComponent,
    CardComponent,
  ],
  template: `
    <header class="page-header">
      <div>
        <h1 class="page-title">My Requests</h1>
        <p class="page-subtitle">Track your borrowing history and request statuses.</p>
      </div>
    </header>

    @if (store.loading()) {
      <app-spinner label="Loading your requests" />
    } @else if (store.error(); as error) {
      <app-card>
        <app-empty-state
          icon="⚠️"
          title="Couldn't load your requests"
          [message]="safeMessage(error)"
        >
          <button app-button variant="secondary" (click)="store.retry()">Try Again</button>
        </app-empty-state>
      </app-card>
    } @else if (store.isEmpty()) {
      <app-card>
        <app-empty-state
          icon="🗂️"
          title="No borrowing requests yet"
          message="Browse the catalog and request to borrow a book to see it here."
        >
          <a routerLink="/books" class="cta">Browse Books</a>
        </app-empty-state>
      </app-card>
    } @else {
      <section aria-label="Your borrowing requests">
        <app-card [flat]="true">
          @for (request of store.items(); track request.id) {
            <app-request-row [request]="request" />
          }
        </app-card>
      </section>

      <app-pagination
        [currentPage]="store.page()"
        [totalPages]="store.totalPages()"
        [totalItems]="store.totalItems()"
        [pageSize]="store.pageSize()"
        (pageChange)="store.setPage($event)"
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

    app-pagination {
      margin-top: var(--space-5);
    }
  `,
})
export class MyRequestsPageComponent {
  readonly store = inject(RequestsStore);

  constructor() {
    this.store.configure('mine');
    this.store.load();
  }

  protected safeMessage(error: AppError): string {
    return error.isClientFixable
      ? error.message
      : 'An unexpected problem occurred. Please try again.';
  }
}
