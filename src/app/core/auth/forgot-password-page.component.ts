import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AppError } from '../http/app-error';
import { AuthService } from './auth.service';
import { AutofocusDirective } from '../../shared/directives/autofocus.directive';

/**
 * "Forgot password" page: requests a reset email. The backend responds
 * generically (anti-enumeration), so success UI never confirms whether the
 * account exists.
 */
@Component({
  selector: 'app-forgot-password-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AutofocusDirective],
  template: `
    <div class="login">
      <div class="login__panel">
        <div class="login__brand">
          <span class="login__brand-icon" aria-hidden="true">🔑</span>
          <h1 class="login__title">Reset your password</h1>
          <p class="login__subtitle">Enter your email and we'll send you a reset link.</p>
        </div>

        @if (sent()) {
          <div class="login__success" role="status">
            ✓ If an account exists for <strong>{{ submittedEmail() }}</strong
            >, a reset link is on its way. Check your inbox — the link expires in 30 minutes.
          </div>
          <a routerLink="/login" class="login__submit login__submit--link">Back to Sign In</a>
        } @else {
          @if (errorMessage(); as error) {
            <div class="login__error" role="alert">{{ error }}</div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" class="login__form" novalidate>
            <div class="field">
              <label class="field__label" for="email">Email</label>
              <input
                id="email"
                type="email"
                formControlName="email"
                autocomplete="email"
                spellcheck="false"
                class="field__input"
                appAutofocus
                required
              />
              @if (emailInvalid) {
                <p class="field__error">Please enter a valid email address.</p>
              }
            </div>

            <button type="submit" class="login__submit" [disabled]="submitting()">
              @if (submitting()) {
                Sending…
              } @else {
                Send Reset Link
              }
            </button>
          </form>

          <button type="button" class="login__mode-toggle" (click)="backToLogin()">
            Remembered it? <strong>Sign In</strong>
          </button>
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

    .login__success {
      margin-bottom: var(--space-4);
      padding: var(--space-3) var(--space-4);
      background: var(--color-success-bg);
      border: 1px solid rgba(22, 163, 74, 0.35);
      border-radius: var(--radius-md);
      color: var(--status-approved-fg);
      font-size: var(--fs-sm);
      text-wrap: pretty;
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

    .login__mode-toggle {
      display: block;
      width: 100%;
      margin-top: var(--space-4);
      padding: var(--space-2);
      text-align: center;
      font-size: var(--fs-sm);
      color: var(--color-neutral-600);
      border-radius: var(--radius-md);

      strong {
        color: var(--color-primary-600);
        font-weight: var(--fw-semibold);
      }

      &:hover strong {
        text-decoration: underline;
      }
    }
  `,
})
export class ForgotPasswordPageComponent {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly sent = signal(false);
  readonly submittedEmail = signal('');
  readonly errorMessage = signal('');

  protected form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected get emailInvalid(): boolean {
    const control = this.form.controls.email;
    return control.invalid && (control.touched || control.dirty);
  }

  protected backToLogin(): void {
    void this.router.navigateByUrl('/login');
  }

  protected submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    const { email } = this.form.getRawValue();

    // One-shot request; the API replies generically for unknown emails too.
    this.authService.forgotPassword(email).subscribe({
      next: () => {
        this.submitting.set(false);
        this.submittedEmail.set(email);
        this.sent.set(true);
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(
          error instanceof AppError && error.status === 0
            ? error.message
            : 'Could not send the reset email. Please try again.',
        );
      },
    });
  }
}
