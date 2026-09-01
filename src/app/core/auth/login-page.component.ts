import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthStore } from './auth.store';
import { AppError } from '../http/app-error';
import { AutofocusDirective } from '../../shared/directives/autofocus.directive';

/**
 * Login + sign-up page. Auth UI lives in Core because authentication itself
 * is a core concern here; there is no standalone "auth feature" domain.
 */
@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AutofocusDirective],
  template: `
    <div class="login">
      <div class="login__panel">
        <div class="login__brand">
          <span class="login__brand-icon" aria-hidden="true">📚</span>
          <h1 class="login__title">Library System</h1>
          <p class="login__subtitle">
            {{
              isSignUp()
                ? 'Create your reader account to start borrowing.'
                : 'Sign in to browse, borrow, and manage books.'
            }}
          </p>
        </div>

        @if (errorMessage(); as error) {
          <div class="login__error" role="alert">{{ error }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" class="login__form" novalidate>
          @if (isSignUp()) {
            <div class="field">
              <label class="field__label" for="fullName">Full name</label>
              <input
                id="fullName"
                type="text"
                formControlName="fullName"
                autocomplete="name"
                maxlength="200"
                class="field__input"
                appAutofocus
                required
              />
              @if (fullNameInvalid) {
                <p class="field__error">Please enter your full name.</p>
              }
            </div>
          }

          <div class="field">
            <label class="field__label" for="email">Email</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              autocomplete="email"
              spellcheck="false"
              class="field__input"
              [appAutofocus]="!isSignUp()"
              required
            />
            @if (emailInvalid) {
              <p class="field__error">Please enter a valid email address.</p>
            }
          </div>

          <div class="field">
            <label class="field__label" for="password">Password</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              [autocomplete]="isSignUp() ? 'new-password' : 'current-password'"
              class="field__input"
              required
            />
            @if (passwordInvalid) {
              <p class="field__error">
                {{
                  isSignUp() ? 'Password must be at least 8 characters.' : 'Password is required.'
                }}
              </p>
            }
          </div>

          @if (!isSignUp()) {
            <a routerLink="/forgot-password" class="login__forgot">Forgot password?</a>
          }

          <button type="submit" class="login__submit" [disabled]="submitting()">
            @if (submitting()) {
              {{ isSignUp() ? 'Creating Account…' : 'Signing In…' }}
            } @else {
              {{ isSignUp() ? 'Create Account' : 'Sign In' }}
            }
          </button>
        </form>

        <button type="button" class="login__mode-toggle" (click)="toggleMode()">
          @if (isSignUp()) {
            Already have an account? <strong>Sign In</strong>
          } @else {
            New to the library? <strong>Create an Account</strong>
          }
        </button>

        @if (!isSignUp()) {
          <div class="login__hint">
            <p class="login__hint-title">Demo accounts</p>
            <p>Admin — admin&#64;library.local / Admin&#64;12345</p>
            <p>User — user&#64;library.local / User&#64;12345</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
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

      &:invalid:not(:focus):not(:placeholder-shown) {
        /* handled by explicit error text; avoid UA :invalid styling */
        border-color: var(--color-neutral-300);
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
      transition: background-color var(--transition-fast);

      &:hover:not(:disabled) {
        background: var(--color-primary-700);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
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

      &:focus-visible {
        background: var(--color-primary-50);
      }
    }

    .login__forgot {
      align-self: flex-end;
      font-size: var(--fs-xs);
      color: var(--color-primary-600);

      &:hover {
        text-decoration: underline;
      }
    }

    .login__hint {
      margin-top: var(--space-6);
      padding-top: var(--space-4);
      border-top: 1px dashed var(--color-neutral-300);
      font-size: var(--fs-xs);
      color: var(--color-neutral-500);

      p + p {
        margin-top: var(--space-1);
      }
    }

    .login__hint-title {
      font-weight: var(--fw-semibold);
      color: var(--color-neutral-600);
    }
  `,
})
export class LoginPageComponent {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(NonNullableFormBuilder);

  /** 'signin' shows only email/password; 'signup' adds the full-name field. */
  readonly mode = signal<'signin' | 'signup'>('signin');

  protected isSignUp = () => this.mode() === 'signup';
  protected submitting = signal(false);
  protected errorMessage = signal('');

  protected form = this.fb.group({
    fullName: ['', [Validators.required, Validators.maxLength(200)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  constructor() {
    // Sign-in mode: the name field is hidden and excluded from validation.
    this.form.controls.fullName.disable();
  }

  protected get fullNameInvalid(): boolean {
    const control = this.form.controls.fullName;
    return control.invalid && (control.touched || control.dirty);
  }

  protected get emailInvalid(): boolean {
    const control = this.form.controls.email;
    return control.invalid && (control.touched || control.dirty);
  }

  protected get passwordInvalid(): boolean {
    const control = this.form.controls.password;
    return control.invalid && (control.touched || control.dirty);
  }

  protected toggleMode(): void {
    this.errorMessage.set('');

    if (this.isSignUp()) {
      // Leaving sign-up: release the name field and the signup-grade rules.
      this.form.controls.fullName.reset('');
      this.form.controls.fullName.disable();
      this.form.controls.password.setValidators([Validators.required]);
      this.mode.set('signin');
      this.form.controls.password.updateValueAndValidity();
      return;
    }

    // Entering sign-up: require the name and an 8-character minimum password.
    this.form.controls.fullName.enable();
    this.form.controls.password.setValidators([Validators.required, Validators.minLength(8)]);
    this.form.controls.password.updateValueAndValidity();
    this.mode.set('signup');
  }

  protected submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    const { email, password } = this.form.getRawValue();

    const session$ = this.isSignUp()
      ? this.authStore.register(this.form.getRawValue().fullName.trim(), email, password)
      : this.authStore.login(email, password);

    // One-shot auth calls complete or error; no long-lived subscription.
    session$.subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        void this.router.navigateByUrl(returnUrl ?? '/books');
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(this.explain(error));
      },
    });
  }

  private explain(error: unknown): string {
    if (!(error instanceof AppError)) {
      return this.isSignUp()
        ? 'Account creation failed. Please try again.'
        : 'Sign-in failed. Please try again.';
    }

    switch (error.status) {
      case 409:
        return 'An account with this email already exists. Try signing in instead.';
      case 401:
        return 'Incorrect email or password.';
      case 0:
        return error.message; // connection problem — already user-friendly
      default:
        if (this.isSignUp()) {
          // Surface the first field-level backend message when present
          // (e.g. invalid email format reported by the API).
          const detail = error.details.find((d) => d.message)?.message;
          return detail ?? error.message;
        }
        return error.status === 403 ? error.message : 'Sign-in failed. Please try again.';
    }
  }
}
