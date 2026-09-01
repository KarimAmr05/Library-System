import { Injectable, signal } from '@angular/core';

/**
 * Root-provided global unread-notification-count state.
 * The header reads this; the notifications feature updates it.
 * Kept in Core so Core never needs to import the Notifications feature.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsBadgeStore {
  private readonly _unreadCount = signal(0);

  readonly unreadCount = this._unreadCount.asReadonly();

  setCount(count: number): void {
    this._unreadCount.set(Math.max(0, count));
  }

  increment(): void {
    this._unreadCount.update((count) => count + 1);
  }

  decrement(): void {
    this._unreadCount.update((count) => Math.max(0, count - 1));
  }

  reset(): void {
    this._unreadCount.set(0);
  }
}
