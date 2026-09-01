import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AppError } from '../http/app-error';
import { AuthStore } from './auth.store';
import { AutofocusDirective } from '../../shared/directives/autofocus.directive';

/**
 * Destructive confirmation dialog for permanent account deletion.
 * Requires the account password; the flow (API call + local logout) is
 * orchestrated by the app shell, never by this component.
 */
@Component({
  selector: 'app-delete-account-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, AutofocusDirective],
  template: `
    <div class="overlay" (click)="cancel()">
      <div
        class="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        (click)="$event.stopPropagation()"
      >
        <h2 id="delete-account-title" class="dialog__title">Delete your account?</h2>
        <p class="dialog__warning">
          This permanently deletes <strong>{{ email() }}</strong> along with your borrowing history
          and notifications. <strong>This cannot be undone.</strong>
        </p>

        <label class="dialog__label" for="delete-password">Confirm with your password</label>
        <input
          id="delete-password"
          type="password"
          autocomplete="current-password"
          class="dialog__input"
          placeholder="Your password"
          [ngModel]="password()"
          (ngModelChange)="password.set($event)"
          (keydown.enter)="submit()"
          appAutofocus
          required
        />

        @if (errorMessage(); as message) {
          <p class="dialog__error" role="alert">{{ message }}</p>
        }

        <div class="dialog__actions">
          <button type="button" class="btn btn--secondary" (click)="cancel()">Cancel</button>
          <button
            type="button"
            class="btn btn--danger"
            [disabled]="!password() || submitting()"
            (click)="submit()"
          >
            {{ submitting() ? 'Deleting…' : 'Delete My Account' }}
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
      color: var(--status-denied-fg);
    }

    .dialog__warning {
      margin-top: var(--space-2);
      margin-bottom: var(--space-4);
      font-size: var(--fs-sm);
      color: var(--color-neutral-600);
      text-wrap: pretty;
    }

    .dialog__label {
      display: block;
      margin-bottom: var(--space-1);
      font-size: var(--fs-sm);
      font-weight: var(--fw-medium);
      color: var(--color-neutral-700);
    }

    .dialog__input {
      width: 100%;
      padding: var(--space-3);
      background: var(--color-neutral-0);
      border: 1px solid var(--color-neutral-300);
      border-radius: var(--radius-md);

      &:focus-visible {
        outline-offset: 0;
        border-color: var(--color-primary-500);
      }
    }

    .dialog__error {
      margin-top: var(--space-2);
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
      transition: background-color var(--transition-fast);
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
export class DeleteAccountDialogComponent {
  private readonly authStore = inject(AuthStore);

  readonly email = input.required<string>();

  readonly cancelled = output<void>();
  readonly deleted = output<void>();

  protected readonly password = signal('');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly canSubmit = computed(() => this.password().length > 0 && !this.submitting());

  protected cancel(): void {
    if (!this.submitting()) {
      this.cancelled.emit();
    }
  }

  protected submit(): void {
    if (!this.canSubmit()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    this.authStore.deleteAccount(this.password()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.deleted.emit();
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(
          error instanceof AppError
            ? error.status === 401
              ? 'Incorrect password. The account was not deleted.'
              : error.isClientFixable
                ? error.message
                : 'Could not delete the account. Please try again.'
            : 'Could not delete the account. Please try again.',
        );
      },
    });
  }
}
