import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Book } from '../data/book.model';

/** Presentational catalog card. Receives a Book via input; no API calls. */
@Component({
  selector: 'app-book-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <a class="card" [routerLink]="['/books', book().id]">
      <div class="card__cover" aria-hidden="true" [style.background]="coverGradient()">
        <span class="card__initial" [style.color]="initialColor()">{{ initial() }}</span>
      </div>

      <div class="card__body">
        <h3 class="card__title" [title]="book().title">{{ book().title }}</h3>
        <p class="card__author">{{ book().author }}</p>

        @if (book().category; as category) {
          <span class="card__category">{{ category }}</span>
        }
      </div>

      <div class="card__footer">
        <span class="card__availability" [class.card__availability--out]="!book().isAvailable">
          @if (book().isAvailable) {
            {{ book().availableCopies }} of {{ book().totalCopies }} available
          } @else {
            Not available
          }
        </span>
        <span class="card__cta" aria-hidden="true">View →</span>
      </div>
    </a>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }

    .card {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--color-neutral-0);
      border: 1px solid var(--color-neutral-200);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
      transition:
        box-shadow var(--transition-normal),
        transform var(--transition-normal),
        border-color var(--transition-normal);

      &:hover,
      &:focus-visible {
        transform: translateY(-2px);
        border-color: var(--color-primary-400);
        box-shadow: var(--shadow-md);
      }
    }

    .card__cover {
      display: grid;
      place-items: center;
      height: 7rem;
      /* Gradient comes from coverGradient() so covers vary by category. */
    }

    .card__initial {
      font-size: var(--fs-3xl);
      font-weight: var(--fw-bold);
    }

    .card__body {
      flex: 1;
      padding: var(--space-4);
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .card__title {
      font-size: var(--fs-md);
      font-weight: var(--fw-semibold);
      display: -webkit-box;
      -webkit-box-orient: vertical;
      line-clamp: 2;
      -webkit-line-clamp: 2;
      overflow: hidden;
    }

    .card__author {
      font-size: var(--fs-sm);
      color: var(--color-neutral-500);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .card__category {
      align-self: flex-start;
      margin-top: var(--space-2);
      padding: 0.125rem var(--space-2);
      font-size: var(--fs-xs);
      color: var(--color-primary-700);
      background: var(--color-primary-50);
      border-radius: var(--radius-full);
    }

    .card__footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      border-top: 1px solid var(--color-neutral-100);
      font-size: var(--fs-xs);
    }

    .card__availability {
      color: var(--status-approved-fg);
      font-weight: var(--fw-medium);
    }

    .card__availability--out {
      color: var(--color-neutral-500);
    }

    .card__cta {
      color: var(--color-primary-600);
      font-weight: var(--fw-semibold);
    }
  `,
})
export class BookCardComponent {
  readonly book = input.required<Book>();

  protected readonly initial = () => this.book().title.charAt(0).toUpperCase();

  /**
   * Deterministic pastel gradient derived from the category (or title), so
   * the catalog grid gets varied but stable cover colors.
   */
  protected readonly hue = () => {
    const seed = this.book().category ?? this.book().title;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % 360;
  };

  protected readonly coverGradient = () =>
    `linear-gradient(135deg, hsl(${this.hue()}, 85%, 90%), hsl(${this.hue()}, 70%, 78%))`;

  protected readonly initialColor = () => `hsl(${this.hue()}, 60%, 32%)`;
}
