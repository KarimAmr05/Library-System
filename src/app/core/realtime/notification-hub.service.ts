import { Injectable, computed, inject, signal } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  IHttpConnectionOptions,
  LogLevel,
} from '@microsoft/signalr';
import { Observable, Subject } from 'rxjs';

import { APP_CONFIG } from '../config/app-config.token';
import { AuthService } from '../auth/auth.service';

/** Payload pushed by the backend hub's `notificationReceived` event. */
export interface PushedNotification {
  id: string;
  recipientUserId: string;
  recipientRole: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

/**
 * Owns the SignalR connection to /hubs/notifications.
 * Features subscribe to events; no SignalR details leak outside Core.
 *
 * Authentication uses the `access_token` query-string handshake via
 * accessTokenFactory (the backend JwtBearer events read it for hub paths),
 * so the connection re-reads the current token on every (re)connect.
 */
@Injectable({ providedIn: 'root' })
export class NotificationHubService {
  private readonly config = inject(APP_CONFIG);
  private readonly authService = inject(AuthService);

  private connection: HubConnection | null = null;

  private readonly connectionStateSignal = signal<HubConnectionState>(
    HubConnectionState.Disconnected,
  );
  private readonly notificationSubject = new Subject<PushedNotification>();
  private readonly reconnectedSubject = new Subject<void>();

  /** Current hub connection state. */
  readonly connectionState = this.connectionStateSignal.asReadonly();

  readonly isConnected = computed(() => this.connectionState() === HubConnectionState.Connected);

  /** Stream of real-time pushed notifications. */
  readonly notificationReceived$: Observable<PushedNotification> =
    this.notificationSubject.asObservable();

  /** Emits once after every successful automatic reconnect. */
  readonly reconnected$: Observable<void> = this.reconnectedSubject.asObservable();

  /** Reachability verdict for the hub endpoint (TTL-cached). */
  private availability$: Promise<boolean> | null = null;
  private availabilityCheckedAtMs = 0;

  /**
   * Probe: does the hub respond at all (e.g. backend running, proxy routed)?
   * The verdict is cached briefly (5 minutes) so doomed negotiate requests
   * are not spammed, but a backend coming back up is still detected on the
   * next start attempt instead of being dead for the whole session.
   */
  private checkReachable(): Promise<boolean> {
    const TTL_MS = 5 * 60 * 1000;
    const now = Date.now();
    if (this.availability$ && now - this.availabilityCheckedAtMs < TTL_MS) {
      return this.availability$;
    }

    this.availabilityCheckedAtMs = now;
    this.availability$ = (async () => {
      try {
        const response = await fetch(`${this.config.hubUrl}/negotiate?negotiateVersion=1`, {
          method: 'POST',
          mode: 'cors',
        });
        return response.status !== 404;
      } catch {
        return false;
      }
    })();
    return this.availability$;
  }

  /**
   * Starts the hub connection if not already active/starting.
   * Auth uses the documented `access_token` query-string handshake.
   */
  async start(): Promise<void> {
    if (
      this.connection &&
      (this.connectionState() === HubConnectionState.Connected ||
        this.connectionState() === HubConnectionState.Connecting ||
        this.connectionState() === HubConnectionState.Reconnecting)
    ) {
      return;
    }

    if (!(await this.checkReachable())) {
      return; // hub endpoint unreachable — REST remains the fallback
    }

    const token = this.authService.getToken();
    if (!token) {
      return; // nothing to authenticate with
    }

    const options: IHttpConnectionOptions = {
      accessTokenFactory: () => this.authService.getToken() ?? '',
      skipNegotiation: false,
      logMessageContent: false,
    };

    const builder = new HubConnectionBuilder()
      .withUrl(this.config.hubUrl, options)
      .configureLogging(LogLevel.Warning)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000]);

    const connection = builder.build();

    connection.on('notificationReceived', (payload: PushedNotification) => {
      this.notificationSubject.next(payload);
    });

    connection.onreconnecting(() =>
      this.connectionStateSignal.set(HubConnectionState.Reconnecting),
    );

    connection.onreconnected(() => {
      this.connectionStateSignal.set(HubConnectionState.Connected);
      this.reconnectedSubject.next();
    });

    connection.onclose((error) => {
      this.connectionStateSignal.set(HubConnectionState.Disconnected);
      if (error) {
        console.warn('[notifications-hub] closed unexpectedly:', error.message);
      }
    });

    this.connection = connection;
    this.connectionStateSignal.set(HubConnectionState.Connecting);

    try {
      await connection.start();
      this.connectionStateSignal.set(HubConnectionState.Connected);
    } catch (error) {
      this.connectionStateSignal.set(HubConnectionState.Disconnected);
      // Non-fatal: REST polling remains the fallback source of truth.
      console.warn(
        '[notifications-hub] failed to start:',
        error instanceof Error ? error.message : error,
      );
    }
  }

  /** Gracefully stops the connection (e.g. on logout). Idempotent. */
  async stop(): Promise<void> {
    if (!this.connection || this.connectionState() === HubConnectionState.Disconnected) {
      return;
    }
    await this.connection.stop().catch(() => undefined);
    this.connection = null;
  }
}
