import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AppError } from '../http/app-error';
import { AuthService } from './auth.service';
import { AutofocusDirective } from '../../shared/directives/autofocus.directive';

/**
 * Password reset landing page — reached from the emailed link
 * (/reset-password?token=…&email=…). Requires the new password twice and
 * reports invalid/expired tokens with a path back to requesting a new one.
 */
@Component({
  selector: 'app-reset-password-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AutofocusDirective],
  template: `
    <div class="login">
      <div class="login__panel">
        <div class="login__brand">
          <span class="login__brand-icon" aria-hidden="true">🔒</span>
          <h1 class="login__title">Choose a new password</h1>
          @if (email()) {
            <p class="login__subtitle">for {{ email() }}</p>
          }
        </div>

        @if (succeeded()) {
          <div class="login__success" role="status">
            ✓ Your password has been updated. You can now sign in with it.
          </div>
          <a routerLink="/login" class="login__submit login__submit--link">Go to Sign In</a>
        } @else if (tokenMissing()) {
          <div class="login__error" role="alert">
            This reset link is incomplete. Please request a new one.
          </div>
          <a routerLink="/forgot-password" class="login__submit login__submit--link">
            Request a New Link
          </a>
        } @else {
          @if (errorMessage(); as error) {
            <div class="login__error" role="alert">
              {{ error }}
              <a routerLink="/forgot-password" class="login__error-link">Request a new link</a>
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" class="login__form" novalidate>
            <div class="field">
              <label class="field__label" for="newPassword">New password</label>
              <input
                id="newPassword"
                type="password"
                formControlName="newPassword"
                autocomplete="new-password"
                class="field__input"
                appAutofocus
                required
              />
              @if (passwordInvalid) {
                <p class="field__error">Password must be at least 8 characters.</p>
              }
            </div>

            <div class="field">
              <label class="field__label" for="confirmPassword">Confirm password</label>
              <input
                id="confirmPassword"
                type="password"
                formControlName="confirmPassword"
                autocomplete="new-password"
                class="field__input"
                required
              />
              @if (mismatch) {
                <p class="field__error">Passwords do not match.</p>
              }
            </div>

            <button type="submit" class="login__submit" [disabled]="submitting()">
              @if (submitting()) {
                Updating…
              } @else {
                Update Password
              }
            </button>
          </form>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .login {
      display: grid;
      place-items: center;
      min-height: 100dvh;
      padding: var(--space-6);
      background:
        radial-gradient(48rem 32rem at 8% -10%, var(--color-primary-200), transparent 60%),
        radial-gradient(40rem 28rem at 108% 110%, var(--color-primary-100), transparent 55%),
        linear-gradient(160deg, var(--color-primary-50), var(--color-neutral-100));
    }

    .login__panel {
      width: min(100%, 26rem);
      padding: var(--space-8);
      background: var(--color-neutral-0);
      border: 1px solid var(--color-neutral-200);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-lg);
    }

    .login__brand {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
      margin-bottom: var(--space-6);
      text-align: center;
    }

    .login__brand-icon {
      font-size: var(--fs-3xl);
    }

    .login__title {
      font-size: var(--fs-2xl);
    }

    .login__subtitle {
      font-size: var(--fs-sm);
      color: var(--color-neutral-500);
      overflow-wrap: anywhere;
    }

    .login__error {
      margin-bottom: var(--space-4);
      padding: var(--space-3) var(--space-4);
      background: var(--color-danger-bg);
      border: 1px solid rgba(220, 38, 38, 0.35);
      border-radius: var(--radius-md);
      color: var(--status-denied-fg);
      font-size: var(--fs-sm);
    }

    .login__error-link {
      display: block;
      margin-top: var(--space-1);
      color: inherit;
      font-weight: var(--fw-semibold);
      text-decoration: underline;
    }

    .login__success {
      margin-bottom: var(--space-4);
      padding: var(--space-3) var(--space-4);
      background: var(--color-success-bg);
      border: 1px solid rgba(22, 163, 74, 0.35);
      border-radius: var(--radius-md);
      color: var(--status-approved-fg);
      font-size: var(--fs-sm);
    }

    .login__form {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .field__label {
      font-size: var(--fs-sm);
      font-weight: var(--fw-medium);
      color: var(--color-neutral-700);
    }

    .field__input {
      padding: var(--space-3);
      background: var(--color-neutral-0);
      border: 1px solid var(--color-neutral-300);
      border-radius: var(--radius-md);
      transition: border-color var(--transition-fast);

      &:focus-visible {
        outline-offset: 0;
        border-color: var(--color-primary-500);
      }
    }

    .field__error {
      font-size: var(--fs-xs);
      color: var(--status-denied-fg);
    }

    .login__submit {
      display: block;
      margin-top: var(--space-2);
      padding: var(--space-3);
      background: var(--color-primary-600);
      color: var(--color-neutral-0);
      font-weight: var(--fw-semibold);
      border-radius: var(--radius-md);
      text-align: center;
      transition: background-color var(--transition-fast);

      &:hover:not(:disabled) {
        background: var(--color-primary-700);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .login__submit--link {
      display: block;
    }
  `,
})
export class ResetPasswordPageComponent {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);

  /** Query params bound via withComponentInputBinding. */
  readonly token = input<string | null>(null);
  readonly email = input<string | null>(null);

  readonly submitting = signal(false);
  readonly succeeded = signal(false);
  readonly errorMessage = signal('');

  protected form = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  protected readonly tokenMissing = () => !this.token() || !this.email();

  protected get passwordInvalid(): boolean {
    const control = this.form.controls.newPassword;
    return control.invalid && (control.touched || control.dirty);
  }

  protected get mismatch(): boolean {
    const { newPassword, confirmPassword } = this.form.getRawValue();
    return (
      this.form.controls.confirmPassword.touched &&
      !!confirmPassword &&
      newPassword !== confirmPassword
    );
  }

  protected submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid || this.submitting()) {
      return;
    }

    const { newPassword, confirmPassword } = this.form.getRawValue();
    if (newPassword !== confirmPassword) {
      this.form.controls.confirmPassword.markAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    this.authService.resetPassword(this.email()!, this.token()!, newPassword).subscribe({
      next: () => {
        this.submitting.set(false);
        this.succeeded.set(true);
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(
          error instanceof AppError && error.isClientFixable
            ? error.message
            : 'Could not update the password. Please try again.',
        );
      },
    });
  }
}
