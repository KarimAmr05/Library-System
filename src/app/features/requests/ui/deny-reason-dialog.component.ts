import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AutofocusDirective } from '../../../shared/directives/autofocus.directive';

/**
 * Accessible modal dialog collecting the required denial reason
 * (documented BorrowRequestDeny.reason). Emits the reason; never calls APIs.
 */
@Component({
  selector: 'app-deny-reason-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, AutofocusDirective],
  template: `
    <div class="overlay" (click)="cancel()">
      <div
        class="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deny-dialog-title"
        (click)="$event.stopPropagation()"
      >
        <h2 id="deny-dialog-title" class="dialog__title">Deny borrow request</h2>
        <p class="dialog__subtitle">
          Provide a reason for denying this request. The requester will see it in their history.
        </p>

        <label class="dialog__label" for="deny-reason"
          >Reason <span aria-hidden="true">*</span></label
        >
        <textarea
          id="deny-reason"
          class="dialog__textarea"
          rows="4"
          maxlength="500"
          placeholder="Explain why this request is being denied…"
          [ngModel]="reason()"
          (ngModelChange)="onReasonInput($event)"
          appAutofocus
          required
          [attr.aria-invalid]="showValidationError()"
          aria-describedby="deny-reason-error"
        ></textarea>

        @if (showValidationError()) {
          <p id="deny-reason-error" class="dialog__error" role="alert">
            A denial reason of at least {{ MIN_REASON_LENGTH }} characters is required.
          </p>
        }

        <div class="dialog__actions">
          <button type="button" class="btn btn--secondary" (click)="cancel()">Cancel</button>
          <button type="button" class="btn btn--danger" [disabled]="!isValid()" (click)="submit()">
            Deny Request
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .overlay {
      position: fixed;
      inset: 0;
      z-index: var(--z-modal, 300);
      display: grid;
      place-items: center;
      padding: var(--space-4);
      background: rgb(15 23 42 / 0.5);
      overscroll-behavior: contain;
    }

    .dialog {
      width: min(100%, 28rem);
      padding: var(--space-6);
      background: var(--color-neutral-0);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
    }

    .dialog__title {
      font-size: var(--fs-xl);
    }

    .dialog__subtitle {
      margin-top: var(--space-1);
      margin-bottom: var(--space-4);
      font-size: var(--fs-sm);
      color: var(--color-neutral-500);
    }

    .dialog__label {
      display: block;
      font-size: var(--fs-sm);
      font-weight: var(--fw-medium);
      color: var(--color-neutral-700);
      margin-bottom: var(--space-1);

      span {
        color: var(--color-danger);
      }
    }

    .dialog__textarea {
      width: 100%;
      padding: var(--space-3);
      background: var(--color-neutral-0);
      border: 1px solid var(--color-neutral-300);
      border-radius: var(--radius-md);
      resize: vertical;
      font-size: var(--fs-sm);

      &:focus-visible {
        outline-offset: 0;
        border-color: var(--color-primary-500);
      }
    }

    .dialog__error {
      margin-top: var(--space-1);
      font-size: var(--fs-xs);
      color: var(--status-denied-fg);
    }

    .dialog__actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-2);
      margin-top: var(--space-5);
    }

    .btn {
      padding: var(--space-2) var(--space-4);
      border-radius: var(--radius-md);
      font-size: var(--fs-sm);
      font-weight: var(--fw-semibold);
      transition:
        background-color var(--transition-fast),
        border-color var(--transition-fast);
    }

    .btn--secondary {
      border: 1px solid var(--color-neutral-300);
      color: var(--color-neutral-700);

      &:hover {
        background: var(--color-neutral-100);
      }
    }

    .btn--danger {
      background: var(--color-danger);
      color: var(--color-neutral-0);

      &:hover:not(:disabled) {
        background: #b91c1c;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  `,
  host: {
    '(keydown.escape)': 'cancel()',
  },
})
export class DenyReasonDialogComponent {
  readonly requestTitle = input('');
  readonly reason = input('');

  readonly confirmed = output<string>();
  readonly cancelled = output<void>();

  protected readonly MIN_REASON_LENGTH = 3; // backend requires minLength 3

  private readonly draftReason = signal('');
  private readonly touched = signal(false);

  protected readonly showValidationError = computed(() => this.touched() && !this.isValid());

  protected onReasonInput(value: string): void {
    this.draftReason.set(value.trim());
    this.touched.set(true);
  }

  protected isValid(): boolean {
    return this.draftReason().length >= this.MIN_REASON_LENGTH;
  }

  protected submit(): void {
    if (!this.isValid()) {
      this.touched.set(true);
      return;
    }
    this.confirmed.emit(this.draftReason());
  }

  protected cancel(): void {
    this.cancelled.emit();
  }
}
