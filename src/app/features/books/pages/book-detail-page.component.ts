import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AppError } from '../../../core/http/app-error';
import { AuthStore } from '../../../core/auth/auth.store';
import { CardComponent } from '../../../shared/ui/card.component';
import { SpinnerComponent } from '../../../shared/ui/spinner.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { Book } from '../data/book.model';
import { BooksApiService } from '../data/books-api.service';
import { BorrowRequestFormComponent } from '../../requests/ui/borrow-request-form.component';
import { BorrowingRequest } from '../../requests/data/borrowing-request.model';
import { RequestsApiService } from '../../requests/data/requests-api.service';

type DetailPhase = 'loading' | 'ready' | 'error' | 'not-found';

/**
 * Smart page: single-book details.
 *
 * Architectural note: borrowing spans two domains (books + requests), so this
 * books page uses the requests feature's presentational form and HTTP service
 * rather than duplicating either. The form itself performs no HTTP calls —
 * submission is orchestrated here per the smart/presentational split.
 */
@Component({
  selector: 'app-book-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    CardComponent,
    SpinnerComponent,
    EmptyStateComponent,
    BorrowRequestFormComponent,
  ],
  template: `
    <a routerLink="/books" class="back-link">← Back to catalog</a>

    @switch (phase()) {
      @case ('loading') {
        <app-spinner label="Loading book" />
      }
      @case ('not-found') {
        <app-card>
          <app-empty-state
            icon="🔍"
            title="Book not found"
            message="It may have been removed from the catalog."
          >
            <a routerLink="/books" class="cta">Back to catalog</a>
          </app-empty-state>
        </app-card>
      }
      @case ('error') {
        <app-card>
          <app-empty-state icon="⚠️" title="Couldn't load this book" [message]="errorMessage()">
            <button type="button" class="cta cta--secondary" (click)="loadBook()">Try Again</button>
          </app-empty-state>
        </app-card>
      }
      @case ('ready') {
        @if (book(); as b) {
          <article class="detail">
            <div class="detail__cover" aria-hidden="true">
              <span class="detail__initial">{{ initial(b) }}</span>
            </div>

            <div class="detail__body">
              <h1 class="detail__title">{{ b.title }}</h1>
              <p class="detail__author">by {{ b.author }}</p>

              <dl class="detail__facts">
                @if (b.category; as category) {
                  <div class="detail__fact">
                    <dt>Category</dt>
                    <dd>
                      <span class="detail__chip">{{ category }}</span>
                    </dd>
                  </div>
                }
                @if (b.isbn) {
                  <div class="detail__fact">
                    <dt>ISBN</dt>
                    <dd>{{ b.isbn }}</dd>
                  </div>
                }
                <div class="detail__fact">
                  <dt>Copies</dt>
                  <dd>{{ b.availableCopies }} of {{ b.totalCopies }} available</dd>
                </div>
                <div class="detail__fact">
                  <dt>Status</dt>
                  <dd>
                    <span
                      class="detail__availability"
                      [class.detail__availability--out]="!b.isAvailable"
                    >
                      {{ b.isAvailable ? 'Available' : 'All copies borrowed' }}
                    </span>
                  </dd>
                </div>
              </dl>

              <!-- Borrow section: users only -->
              @if (canBorrow()) {
                <div class="detail__borrow">
                  <h2 class="detail__borrow-title">Request to borrow</h2>

                  @if (!b.isAvailable) {
                    <p class="detail__borrow-note">
                      This title currently has no available copies, so borrowing is disabled.
                    </p>
                  } @else if (submissionSucceeded()) {
                    <p class="detail__success" role="status">
                      ✓ Your request was submitted for review. Track it under "My Requests".
                    </p>
                  } @else {
                    <app-borrow-request-form
                      [submitting]="submittingBorrow()"
                      (submitted)="submitBorrow($event.borrowingPeriodDays)"
                    />
                    @if (submitError(); as message) {
                      <p class="detail__error" role="alert">{{ message }}</p>
                    }
                  }
                </div>
              } @else {
                <p class="detail__admin-note">
                  You are viewing as an administrator — borrowing requests are submitted by users.
                </p>
              }
            </div>
          </article>
        }
      }
    }
  `,
  styles: `
    .back-link {
      display: inline-block;
      margin-bottom: var(--space-4);
      font-size: var(--fs-sm);
      color: var(--color-neutral-600);

      &:hover {
        color: var(--color-primary-600);
      }
    }

    .detail {
      display: flex;
      gap: var(--space-8);
      padding: var(--space-6);
      background: var(--color-neutral-0);
      border: 1px solid var(--color-neutral-200);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);

      @media (max-width: 47.99em) {
        flex-direction: column;
      }
    }

    .detail__cover {
      display: grid;
      place-items: center;
      width: 12rem;
      height: 17rem;
      flex-shrink: 0;
      background: linear-gradient(135deg, var(--color-primary-100), var(--color-primary-300));
      border-radius: var(--radius-lg);
    }

    .detail__initial {
      font-size: 4rem;
      font-weight: var(--fw-bold);
      color: var(--color-primary-700);
    }

    .detail__body {
      flex: 1;
      min-width: 0;
    }

    .detail__title {
      font-size: var(--fs-2xl);
      overflow-wrap: anywhere;
    }

    .detail__author {
      margin-top: var(--space-1);
      font-size: var(--fs-lg);
      color: var(--color-neutral-500);
    }

    .detail__facts {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-6);
      margin-block: var(--space-5);
      padding-block: var(--space-4);
      border-block: 1px solid var(--color-neutral-100);
    }

    .detail__fact dt {
      font-size: var(--fs-xs);
      color: var(--color-neutral-500);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: var(--space-1);
    }

    .detail__fact dd {
      margin: 0;
      font-size: var(--fs-md);
      color: var(--color-neutral-800);
    }

    .detail__chip {
      display: inline-block;
      padding: 0.125rem var(--space-2);
      font-size: var(--fs-xs);
      color: var(--color-primary-700);
      background: var(--color-primary-50);
      border-radius: var(--radius-full);
    }

    .detail__availability {
      color: var(--status-approved-fg);
      font-weight: var(--fw-medium);
    }

    .detail__availability--out {
      color: var(--status-denied-fg);
    }

    .detail__borrow {
      max-width: 24rem;
    }

    .detail__borrow-title {
      font-size: var(--fs-lg);
      margin-bottom: var(--space-3);
    }

    .detail__borrow-note {
      font-size: var(--fs-sm);
      color: var(--color-neutral-500);
    }

    .detail__error {
      margin-top: var(--space-3);
      font-size: var(--fs-sm);
      color: var(--status-denied-fg);
    }

    .detail__success {
      font-size: var(--fs-sm);
      color: var(--status-approved-fg);
      font-weight: var(--fw-medium);
    }

    .detail__admin-note {
      font-size: var(--fs-sm);
      color: var(--color-neutral-500);
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
  `,
})
export class BookDetailPageComponent {
  /** Route param bound via withComponentInputBinding. */
  readonly id = input.required<string>();

  private readonly api = inject(BooksApiService);
  private readonly requestsApi = inject(RequestsApiService);
  private readonly authStore = inject(AuthStore);

  private readonly _book = signal<Book | null>(null);
  private readonly _phase = signal<DetailPhase>('loading');
  protected readonly submittingBorrow = signal(false);
  protected readonly submitError = signal('');
  protected readonly submissionSucceeded = signal(false);

  readonly errorMessage = signal('');

  protected readonly book = this._book.asReadonly();
  protected readonly phase = this._phase.asReadonly();

  protected canBorrow(): boolean {
    return !this.authStore.isAdmin() && !!this.authStore.currentUser();
  }

  constructor() {
    // Reload whenever the route parameter changes (component reuse on navigation).
    effect(() => {
      const bookId = this.id();
      void bookId;
      this.loadBook();
    });
  }

  loadBook(): void {
    const bookId = this.id();
    if (!bookId) {
      return;
    }

    this._phase.set('loading');
    this._book.set(null);
    this.errorMessage.set('');
    this.submissionSucceeded.set(false);
    this.submitError.set('');

    this.api.getBook(bookId).subscribe({
      next: (book) => {
        this._book.set(book);
        this._phase.set('ready');
      },
      error: (error: unknown) => {
        if (error instanceof AppError && error.status === 404) {
          this._phase.set('not-found');
          return;
        }
        this._phase.set('error');
        this.errorMessage.set(
          error instanceof AppError && error.isClientFixable
            ? error.message
            : 'An unexpected problem occurred. Please try again.',
        );
      },
    });
  }

  async submitBorrow(days: number): Promise<void> {
    const book = this._book();
    const user = this.authStore.currentUser();

    if (!book || !user || this.submittingBorrow()) {
      return;
    }

    this.submittingBorrow.set(true);
    this.submitError.set('');

    this.requestsApi
      .submitBorrow({ bookId: book.id, userId: user.id, borrowingPeriodDays: days })
      .subscribe({
        next: (request: BorrowingRequest) => {
          void request;
          this.submittingBorrow.set(false);
          this.submissionSucceeded.set(true);
          // Optimistically reflect one fewer copy in local view state.
          this._book.update((current) =>
            current
              ? { ...current, availableCopies: Math.max(0, current.availableCopies - 1) }
              : current,
          );
        },
        error: (error: unknown) => {
          this.submittingBorrow.set(false);
          this.submitError.set(this.explainSubmitError(error));
        },
      });
  }

  private explainSubmitError(error: unknown): string {
    if (!(error instanceof AppError)) {
      return 'Your request could not be submitted. Please try again.';
    }

    switch (error.status) {
      case 409:
        return error.message || 'This request cannot be created right now.';
      case 422:
        return error.message || 'The borrowing period violates library rules.';
      case 403:
        return "You don't have permission to request borrows.";
      default:
        return error.isClientFixable
          ? error.message
          : 'An unexpected problem occurred. Please try again.';
    }
  }

  protected initial(book: Book): string {
    return book.title.charAt(0).toUpperCase();
  }
}
