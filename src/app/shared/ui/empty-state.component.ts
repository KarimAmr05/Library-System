import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Centered placeholder shown when a list or view has no data. */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty" role="status">
      <div class="empty__icon" aria-hidden="true">{{ icon() }}</div>
      <h2 class="empty__title">{{ title() }}</h2>
      @if (message()) {
        <p class="empty__message">{{ message() }}</p>
      }
      <div class="empty__actions">
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-12) var(--space-6);
      text-align: center;
    }

    .empty__icon {
      display: grid;
      place-items: center;
      width: 3.5rem;
      height: 3.5rem;
      margin-bottom: var(--space-2);
      font-size: var(--fs-2xl);
      color: var(--color-primary-600);
      background: var(--color-primary-50);
      border-radius: var(--radius-full);
    }

    .empty__title {
      font-size: var(--fs-lg);
    }

    .empty__message {
      max-width: 26rem;
      color: var(--color-neutral-500);
      font-size: var(--fs-sm);
    }

    .empty__actions {
      margin-top: var(--space-3);
    }

    :host(.in-card) .empty {
      padding: var(--space-10) var(--space-5);
    }
  `,
})
export class EmptyStateComponent {
  readonly icon = input('📚');
  readonly title = input.required<string>();
  readonly message = input('');
}
