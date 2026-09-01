import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthStore } from '../auth/auth.store';
import { NotificationsBadgeStore } from '../realtime/notifications-badge.store';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="header">
      <div class="header__left">
        <button
          type="button"
          class="header__menu-toggle"
          (click)="menuToggled.emit()"
          aria-label="Toggle navigation menu"
          [attr.aria-expanded]="menuOpen()"
        >
          <span aria-hidden="true">☰</span>
        </button>

        <a routerLink="/books" class="header__brand">
          <span class="header__brand-icon" aria-hidden="true">📚</span>
          <span class="header__brand-name">Library System</span>
        </a>
      </div>

      <nav class="header__nav" aria-label="Primary">
        <a
          routerLink="/books"
          routerLinkActive="header__link--active"
          #rla="routerLinkActive"
          [attr.aria-current]="rla.isActive ? 'page' : null"
          class="header__link"
        >
          Books
        </a>

        @if (authStore.isAdmin()) {
          <a
            routerLink="/requests"
            routerLinkActive="header__link--active"
            #reviewRla="routerLinkActive"
            [attr.aria-current]="reviewRla.isActive ? 'page' : null"
            class="header__link"
          >
            Review Requests
          </a>
        } @else {
          <a
            routerLink="/requests/my"
            routerLinkActive="header__link--active"
            #myRla="routerLinkActive"
            [attr.aria-current]="myRla.isActive ? 'page' : null"
            class="header__link"
          >
            My Requests
          </a>
        }

        <a
          routerLink="/notifications"
          routerLinkActive="header__link--active"
          #notifRla="routerLinkActive"
          [attr.aria-current]="notifRla.isActive ? 'page' : null"
          class="header__link header__link--notifications"
        >
          Notifications
          @if (badgeStore.unreadCount() > 0) {
            <span
              class="header__badge"
              aria-label="{{ badgeStore.unreadCount() }} unread notifications"
            >
              {{ badgeStore.unreadCount() > 99 ? '99+' : badgeStore.unreadCount() }}
            </span>
          }
        </a>
      </nav>

      <div class="header__user">
        @if (authStore.currentUser(); as user) {
          <div class="header__identity">
            <span class="header__role" [class.header__role--admin]="user.role === 'Admin'">
              {{ user.role }}
            </span>
            <span class="header__email">{{ user.email }}</span>
          </div>
          <button type="button" class="header__signout" (click)="signOut()">Sign out</button>
        }
      </div>
    </header>
  `,
  styles: `
    .header {
      position: sticky;
      top: 0;
      z-index: 50;
      display: flex;
      align-items: center;
      gap: var(--space-6);
      height: var(--header-height);
      padding-inline: calc(var(--space-4) + env(safe-area-inset-left))
        calc(var(--space-4) + env(safe-area-inset-right));
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border-bottom: 1px solid var(--color-neutral-200);
      box-shadow: var(--shadow-sm);
    }

    .header__left {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-width: 0;
    }

    .header__menu-toggle {
      display: grid;
      place-items: center;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: var(--radius-md);
      color: var(--color-neutral-700);

      &:hover {
        background: var(--color-neutral-100);
      }
    }

    .header__brand {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      color: var(--color-neutral-900);
      font-weight: var(--fw-bold);
      font-size: var(--fs-lg);
      white-space: nowrap;
    }

    .header__nav {
      display: none;
      align-items: center;
      gap: var(--space-1);
      margin-inline: auto;

      @media (min-width: 48em) {
        display: flex;
      }
    }

    .header__link {
      position: relative;
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-md);
      font-size: var(--fs-sm);
      font-weight: var(--fw-medium);
      color: var(--color-neutral-600);
      transition:
        color var(--transition-fast),
        background-color var(--transition-fast);

      &:hover {
        color: var(--color-primary-700);
        background: var(--color-primary-50);
      }
    }

    .header__link--active,
    .header__link--active:hover {
      color: var(--color-primary-700);
      background: var(--color-primary-100);
    }

    .header__link--notifications {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
    }

    .header__badge {
      display: inline-grid;
      place-items: center;
      min-width: 1.25rem;
      height: 1.25rem;
      padding-inline: 0.25rem;
      background: var(--color-danger);
      color: var(--color-neutral-0);
      font-size: var(--fs-xs);
      font-weight: var(--fw-bold);
      border-radius: var(--radius-full);
    }

    .header__user {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      margin-left: auto;

      @media (min-width: 48em) {
        margin-left: 0;
      }
    }

    .header__identity {
      display: none;
      flex-direction: column;
      align-items: flex-end;
      line-height: 1.3;

      @media (min-width: 64em) {
        display: flex;
      }
    }

    .header__email {
      max-width: 14rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: var(--fs-xs);
      color: var(--color-neutral-500);
    }

    .header__role {
      font-size: var(--fs-xs);
      font-weight: var(--fw-semibold);
      color: var(--color-primary-600);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .header__role--admin {
      color: var(--status-pending-fg);
    }

    .header__signout {
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--color-neutral-300);
      border-radius: var(--radius-md);
      font-size: var(--fs-sm);
      font-weight: var(--fw-medium);
      color: var(--color-neutral-700);
      background: var(--color-neutral-0);
      transition:
        border-color var(--transition-fast),
        color var(--transition-fast);

      &:hover {
        border-color: var(--color-danger);
        color: var(--color-danger);
      }
    }

    /* Mobile-only toggle */
    .header__menu-toggle {
      @media (min-width: 64em) {
        display: none;
      }
    }
  `,
})
export class AppHeaderComponent {
  readonly authStore = inject(AuthStore);
  readonly badgeStore = inject(NotificationsBadgeStore);

  /** Reflects the mobile drawer state for aria-expanded. */
  readonly menuOpen = input(false, { transform: (v: boolean | undefined) => v ?? false });

  readonly menuToggled = output<void>();
  readonly signOutRequested = output<void>();

  protected signOut(): void {
    this.signOutRequested.emit();
  }
}
