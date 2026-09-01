import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Reusable card surface with optional padded body. */
@Component({
  selector: 'app-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-card" [class.app-card--flat]="flat()">
      <div class="app-card__body">
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .app-card {
      background: var(--color-neutral-0);
      border: 1px solid var(--color-neutral-200);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
      transition:
        box-shadow var(--transition-normal),
        transform var(--transition-normal);
    }

    .app-card--flat {
      box-shadow: none;
    }

    .app-card__body {
      padding: var(--space-5);
    }
  `,
})
export class CardComponent {
  readonly flat = input(false, { transform: (v: boolean | undefined) => v ?? false });
}
