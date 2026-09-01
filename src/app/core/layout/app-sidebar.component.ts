import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthStore } from '../auth/auth.store';

/**
 * Role-aware sidebar navigation.
 * Contains its own visible toggle: on desktop it collapses/expands the
 * sidebar to a slim rail; on mobile it closes the slide-over drawer.
 * Which links exist depends on AuthStore.role.
 */
@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav
      class="sidebar"
      [class.sidebar--open]="open()"
      [class.sidebar--collapsed]="collapsed()"
      aria-label="Section navigation"
    >
      <div class="sidebar__header">
        <span class="sidebar__title">Menu</span>
        <!-- Desktop: collapse to rail. Mobile: close the drawer. -->
        <button
          type="button"
          class="sidebar__toggle sidebar__toggle--desktop"
          (click)="collapseToggled.emit()"
          [attr.aria-expanded]="!collapsed()"
          [attr.aria-label]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
        >
          {{ collapsed() ? '»' : '«' }}
        </button>
        <button
          type="button"
          class="sidebar__toggle sidebar__toggle--mobile"
          (click)="closeRequested.emit()"
          aria-label="Close menu"
        >
          ✕
        </button>
      </div>

      <ul class="sidebar__list">
        @for (link of links(); track link.path) {
          <li>
            <a
              class="sidebar__link"
              [routerLink]="link.path"
              routerLinkActive="sidebar__link--active"
              #rla="routerLinkActive"
              [attr.aria-current]="rla.isActive ? 'page' : null"
              [title]="collapsed() ? link.label : null"
            >
              <span class="sidebar__icon" aria-hidden="true">{{ link.icon }}</span>
              <span class="sidebar__label">{{ link.label }}</span>
            </a>
          </li>
        }
      </ul>

      @if (authStore.currentUser(); as user) {
        <div class="sidebar__footer">
          <p class="sidebar__footer-label">Signed in as</p>
          <p class="sidebar__footer-value">{{ user.email }}</p>
          <p class="sidebar__footer-role">{{ user.role }}</p>
          <button type="button" class="sidebar__delete" (click)="deleteRequested.emit()">
            Delete account
          </button>
        </div>
      }
    </nav>
  `,
  styles: `
    .sidebar {
      width: var(--sidebar-width);
      height: calc(100dvh - var(--header-height));
      padding: var(--space-4);
      background: var(--color-neutral-0);
      border-right: 1px solid var(--color-neutral-200);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: width var(--transition-normal), transform var(--transition-normal);

      /* Mobile: slide-over drawer */
      position: fixed;
      inset-block-start: var(--header-height);
      inset-inline-start: 0;
      z-index: 40;
      transform: translateX(-100%);

      @media (min-width: 64em) {
        position: sticky;
        inset-block-start: var(--header-height);
        transform: none;
      }
    }

    .sidebar--open {
      transform: translateX(0);
    }

    /* Desktop collapsed rail */
    @media (min-width: 64em) {
      .sidebar--collapsed {
        width: 4.25rem;
      }

      .sidebar--collapsed .sidebar__label,
      .sidebar--collapsed .sidebar__title,
      .sidebar--collapsed .sidebar__footer {
        display: none;
      }

      .sidebar--collapsed .sidebar__link {
        justify-content: center;
      }

      .sidebar--collapsed .sidebar__header {
        justify-content: center;
      }
    }

    .sidebar__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      margin-bottom: var(--space-4);
    }

    .sidebar__title {
      font-size: var(--fs-xs);
      font-weight: var(--fw-semibold);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-neutral-500);
    }

    .sidebar__toggle {
      display: grid;
      place-items: center;
      width: 2rem;
      height: 2rem;
      border: 1px solid var(--color-neutral-300);
      border-radius: var(--radius-md);
      background: var(--color-neutral-0);
      color: var(--color-neutral-600);
      font-size: var(--fs-sm);
      font-weight: var(--fw-semibold);
      transition:
        background-color var(--transition-fast),
        border-color var(--transition-fast),
        color var(--transition-fast);

      &:hover {
        background: var(--color-primary-50);
        border-color: var(--color-primary-400);
        color: var(--color-primary-700);
      }

      &:focus-visible {
        outline-offset: 1px;
      }
    }

    /* Desktop toggle hidden on small screens, and vice versa. */
    .sidebar__toggle--mobile {
      display: grid;
    }

    .sidebar__toggle--desktop {
      display: none;
    }

    @media (min-width: 64em) {
      .sidebar__toggle--mobile {
        display: none;
      }

      .sidebar__toggle--desktop {
        display: grid;
      }
    }

    .sidebar__list {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .sidebar__link {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3);
      border-radius: var(--radius-md);
      color: var(--color-neutral-700);
      font-size: var(--fs-sm);
      font-weight: var(--fw-medium);
      white-space: nowrap;
      transition:
        background-color var(--transition-fast),
        color var(--transition-fast);

      &:hover {
        background: var(--color-primary-50);
        color: var(--color-primary-700);
      }
    }

    .sidebar__link--active,
    .sidebar__link--active:hover {
      background: var(--color-primary-100);
      color: var(--color-primary-700);
    }

    .sidebar__icon {
      width: 1.25rem;
      text-align: center;
      flex-shrink: 0;
    }

    .sidebar__label {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sidebar__footer {
      padding-top: var(--space-4);
      border-top: 1px solid var(--color-neutral-200);
    }

    .sidebar__footer-label {
      font-size: var(--fs-xs);
      color: var(--color-neutral-500);
    }

    .sidebar__footer-value {
      font-size: var(--fs-sm);
      color: var(--color-neutral-800);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .sidebar__footer-role {
      margin-top: var(--space-1);
      font-size: var(--fs-xs);
      font-weight: var(--fw-semibold);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--color-primary-600);
    }

    .sidebar__delete {
      display: block;
      width: 100%;
      margin-top: var(--space-3);
      padding: var(--space-2);
      border: 1px solid var(--color-neutral-300);
      border-radius: var(--radius-md);
      font-size: var(--fs-xs);
      color: var(--color-neutral-600);
      text-align: center;
      transition:
        color var(--transition-fast),
        border-color var(--transition-fast);

      &:hover {
        border-color: var(--color-danger);
        color: var(--color-danger);
      }
    }
  `
})
export class AppSidebarComponent {
  readonly authStore = inject(AuthStore);

  /** Controls mobile slide-over visibility (desktop ignores this). */
  readonly open = input(false, { transform: (v: boolean | undefined) => v ?? false });

  /** Desktop-only collapsed rail state. */
  readonly collapsed = input(false, { transform: (v: boolean | undefined) => v ?? false });

  readonly navigated = output<void>();
  readonly deleteRequested = output<void>();
  readonly closeRequested = output<void>();
  readonly collapseToggled = output<void>();

  protected links() {
    if (this.authStore.isAdmin()) {
      return [
        { path: '/books', label: 'Browse Catalog', icon: '📖' },
        { path: '/requests', label: 'Review Requests', icon: '🗂️' },
        { path: '/notifications', label: 'Notifications', icon: '🔔' }
      ];
    }

    return [
      { path: '/books', label: 'Browse Books', icon: '📖' },
      { path: '/requests/my', label: 'My Requests', icon: '🗂️' },
      { path: '/notifications', label: 'Notifications', icon: '🔔' }
    ];
  }
}
