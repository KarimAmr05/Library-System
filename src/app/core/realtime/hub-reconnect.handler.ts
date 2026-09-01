import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, switchMap, timer } from 'rxjs';

import { NotificationHubService } from './notification-hub.service';

/**
 * Coordinates post-reconnect synchronization.
 *
 * On reconnection the app MUST refetch persisted notifications via REST:
 * real-time delivery can have gaps while disconnected, so SignalR alone is
 * not a complete notification source of truth.
 *
 * Subscribers (the notifications feature) register an async refetch callback;
 * rapid reconnect cycles are debounced briefly to avoid hammering the API.
 */
@Injectable({ providedIn: 'root' })
export class HubReconnectHandler {
  private readonly hub = inject(NotificationHubService);
  private readonly syncRequested = new Subject<void>();
  private onSyncRequested: (() => void) | null = null;

  constructor() {
    this.syncRequested
      .pipe(
        // Debounce bursts of reconnections; reset the window on newer events.
        switchMap(() => timer(400)),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.onSyncRequested?.());

    this.hub.reconnected$.pipe(takeUntilDestroyed()).subscribe(this.syncRequested);
  }

  /** Registers the REST refetch to run whenever the hub reconnects. */
  registerOnSync(callback: () => void): void {
    this.onSyncRequested = callback;
  }
}
