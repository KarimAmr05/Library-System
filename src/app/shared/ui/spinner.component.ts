import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="spinner"
      [class.spinner--inline]="inline()"
      role="status"
      [attr.aria-label]="label()"
    ></span>
  `,
  styles: `
    :host {
      display: contents;
    }

    .spinner {
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 50%;
      border: 3px solid var(--color-neutral-200);
      border-top-color: var(--color-primary-600);
      animation: spin 800ms linear infinite;
      margin-inline: auto;
    }

    .spinner--inline {
      width: 1.25rem;
      height: 1.25rem;
      border-width: 2px;
      display: inline-block;
      vertical-align: middle;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `,
})
export class SpinnerComponent {
  readonly inline = input(false, { transform: (v: boolean | undefined) => v ?? false });
  readonly label = input('Loading');
}
