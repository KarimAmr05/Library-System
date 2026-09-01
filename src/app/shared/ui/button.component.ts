import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [class]="classes()"
      [type]="type()"
      [disabled]="disabled()"
      [attr.aria-busy]="loading()"
    >
      @if (loading()) {
        <span class="app-btn__spinner" aria-hidden="true"></span>
      }
      <ng-content />
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    .app-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-weight: var(--fw-semibold);
      border-radius: var(--radius-md);
      border: 1px solid transparent;
      transition:
        background-color var(--transition-fast),
        border-color var(--transition-fast),
        color var(--transition-fast),
        box-shadow var(--transition-fast),
        transform var(--transition-fast);
    }

    .app-btn:not(:disabled):active {
      transform: scale(0.97);
    }

    .app-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .app-btn--sm {
      font-size: var(--fs-sm);
      padding: 0.375rem 0.75rem;
    }

    .app-btn--md {
      font-size: var(--fs-md);
      padding: 0.5rem 1rem;
    }

    .app-btn--lg {
      font-size: var(--fs-md);
      padding: 0.75rem 1.5rem;
    }

    .app-btn--primary {
      background: var(--color-primary-600);
      color: var(--color-neutral-0);
      box-shadow: var(--shadow-sm);

      &:hover:not(:disabled) {
        background: var(--color-primary-700);
        box-shadow: var(--shadow-md);
      }
    }

    .app-btn--secondary {
      background: var(--color-neutral-0);
      color: var(--color-neutral-800);
      border-color: var(--color-neutral-300);

      &:hover:not(:disabled) {
        background: var(--color-neutral-100);
        border-color: var(--color-neutral-400);
      }
    }

    .app-btn--ghost {
      background: transparent;
      color: var(--color-primary-600);

      &:hover:not(:disabled) {
        background: var(--color-primary-50);
      }
    }

    .app-btn--danger {
      background: var(--color-danger);
      color: var(--color-neutral-0);

      &:hover:not(:disabled) {
        background: #b91c1c;
      }
    }

    .app-btn__spinner {
      width: 1em;
      height: 1em;
      flex-shrink: 0;
      border-radius: 50%;
      border: 2px solid currentColor;
      border-right-color: transparent;
      animation: app-btn-spin 700ms linear infinite;
    }

    @keyframes app-btn-spin {
      to {
        transform: rotate(360deg);
      }
    }
  `,
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly type = input<'button' | 'submit'>('button');
  readonly disabled = input(false, { transform: (v: boolean | undefined) => v ?? false });
  readonly loading = input(false, { transform: (v: boolean | undefined) => v ?? false });

  protected readonly classes = computed(() => [
    'app-btn',
    `app-btn--${this.variant()}`,
    `app-btn--${this.size()}`,
  ]);
}
