import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { borrowingPeriodValidator } from '../../../shared/validators/borrowing-period.validator';

/** Data emitted on a valid submission. */
export interface BorrowRequestFormSubmission {
  borrowingPeriodDays: number;
}

/**
 * Presentational form for requesting to borrow a book.
 * Validates the documented 1–30 day period locally; performs no HTTP calls —
 * the parent page/store owns submission.
 */
@Component({
  selector: 'app-borrow-request-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <form class="borrow" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div class="borrow__field">
        <label class="borrow__label" for="period">Borrowing period (days)</label>
        <input
          id="period"
          class="borrow__input"
          type="number"
          inputmode="numeric"
          formControlName="borrowingPeriodDays"
          min="1"
          max="30"
          step="1"
          [attr.aria-invalid]="showError('borrowingPeriodDays')"
          aria-describedby="period-hint period-error"
        />
        <p id="period-hint" class="borrow__hint">Allowed range: 1–30 days.</p>
        @if (showError('borrowingPeriodDays')) {
          <p id="period-error" class="borrow__error" role="alert">
            Enter a whole number of days between 1 and 30.
          </p>
        }
      </div>

      <button type="submit" class="borrow__submit" [disabled]="submitting()">
        @if (submitting()) {
          Submitting…
        } @else {
          Request to Borrow
        }
      </button>
    </form>
  `,
  styles: `
    .borrow {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .borrow__field {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .borrow__label {
      font-size: var(--fs-sm);
      font-weight: var(--fw-medium);
      color: var(--color-neutral-700);
    }

    .borrow__input {
      width: 8rem;
      padding: var(--space-2) var(--space-3);
      background: var(--color-neutral-0);
      border: 1px solid var(--color-neutral-300);
      border-radius: var(--radius-md);

      &:focus-visible {
        outline-offset: 0;
        border-color: var(--color-primary-500);
      }
    }

    .borrow__hint,
    .borrow__error {
      font-size: var(--fs-xs);
    }

    .borrow__hint {
      color: var(--color-neutral-500);
    }

    .borrow__error {
      color: var(--status-denied-fg);
    }

    .borrow__submit {
      align-self: flex-start;
      padding: var(--space-2) var(--space-4);
      background: var(--color-primary-600);
      color: var(--color-neutral-0);
      font-weight: var(--fw-semibold);
      border-radius: var(--radius-md);
      transition: background-color var(--transition-fast);

      &:hover:not(:disabled) {
        background: var(--color-primary-700);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }
  `,
})
export class BorrowRequestFormComponent {
  private readonly fb = inject(NonNullableFormBuilder);

  /** True while the parent is submitting. */
  readonly submitting = input(false, { transform: (v: boolean | undefined) => v ?? false });

  readonly submitted = output<BorrowRequestFormSubmission>();

  readonly form = this.fb.group({
    borrowingPeriodDays: this.fb.control<number | null>(14, [
      Validators.required,
      borrowingPeriodValidator(),
    ]),
  });

  protected showError(controlName: 'borrowingPeriodDays'): boolean | undefined {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || control.dirty) ? true : undefined;
  }

  protected submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const days = this.form.controls.borrowingPeriodDays.getRawValue() ?? 0;
    this.submitted.emit({ borrowingPeriodDays: days });
  }
}
