import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AppHeaderComponent } from './core/layout/app-header.component';
import { AppSidebarComponent } from './core/layout/app-sidebar.component';
import { DeleteAccountDialogComponent } from './core/auth/delete-account-dialog.component';
import { AuthStore } from './core/auth/auth.store';
import { NotificationHubService } from './core/realtime/notification-hub.service';

/** Application shell: header + role-aware sidebar + routed content. */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, AppHeaderComponent, AppSidebarComponent, DeleteAccountDialogComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  /** Exposed for the delete-account dialog binding in the template. */
  readonly authStore = inject(AuthStore);
  private readonly hub = inject(NotificationHubService);
  private readonly router = inject(Router);

  /** Sidebar drawer visibility (mobile only). */
  protected readonly sidebarOpen = signal(false);

  /** Desktop-only collapsed rail state. */
  protected readonly sidebarCollapsed = signal(false);

  /** The login route renders full-screen without the shell chrome. */
  protected readonly isAuthRoute = signal(false);

  /** Whether the destructive delete-account confirmation is showing. */
  protected readonly deleteDialogOpen = signal(false);

  /** Backdrop shows behind the mobile slide-over drawer. */
  protected readonly sidebarBackdropVisible = computed(() => this.sidebarOpen());

  /** Auth pages render full-screen, without the shell chrome. */
  private static readonly AUTH_ROUTES = ['/login', '/forgot-password', '/reset-password'];

  private static isAuthUrl(url: string): boolean {
    return App.AUTH_ROUTES.some((route) => url.startsWith(route));
  }

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.isAuthRoute.set(App.isAuthUrl(this.router.url));
        this.sidebarOpen.set(false); // close the mobile drawer on navigation
      });

    // Cover the hard-refresh case: the initial signal value must already
    // reflect the URL the app booted on, before any NavigationEnd arrives.
    this.isAuthRoute.set(App.isAuthUrl(this.router.url));

    // Connect/disconnect the notifications hub with the session lifecycle.
    effect((onCleanup) => {
      if (this.authStore.isAuthenticated()) {
        void this.hub.start();
      }

      onCleanup(() => {
        if (!this.authStore.isAuthenticated()) {
          void this.hub.stop();
        }
      });
    });
  }

  protected toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  protected signOut(): void {
    this.authStore.logout();
    void this.router.navigateByUrl('/login');
  }

  /** Account deleted on the server: the store already cleared the session. */
  protected onAccountDeleted(): void {
    this.deleteDialogOpen.set(false);
    void this.router.navigateByUrl('/login');
  }
}
