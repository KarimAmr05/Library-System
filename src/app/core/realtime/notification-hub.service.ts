import { Injectable, computed, inject, signal } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  IHttpConnectionOptions,
  LogLevel,
} from '@microsoft/signalr';
import { Observable, Subject } from 'rxjs';
import { firstValueFrom } from 'rxjs';

import { APP_CONFIG } from '../config/app-config.token';
import { AuthService } from '../auth/auth.service';
import { GatewayTokenService } from '../http/gateway-token.service';

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
 */
@Injectable({ providedIn: 'root' })
export class NotificationHubService {
  private readonly config = inject(APP_CONFIG);
  private readonly authService = inject(AuthService);
  private readonly gatewayTokens = inject(GatewayTokenService);

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

  /** Session-scoped reachability verdict for the hub endpoint (one probe max). */
  private availability$: Promise<boolean> | null = null;

  /**
   * One-shot probe: is the hub routed by the gateway at all? The WSO2 API
   * only maps /api/** resources, so /hubs/** answers 404 — and a plain POST
   * that the browser cannot read (CORS-blocked) also means unreachable.
   * Cached for the session so neither retries nor re-logins re-spam the
   * gateway with doomed negotiate requests.
   */
  private checkReachable(): Promise<boolean> {
    this.availability$ ??= (async () => {
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
      return; // gateway does not route the hub — REST polling remains the fallback
    }

    const token = this.authService.getToken();
    if (!token) {
      return; // nothing to authenticate with
    }

    // Mirror the HTTP interceptor scheme: WSO2 token in `Authorization`,
    // backend JWT in `user` (plus the access_token query param handshake).
    // Non-fatal if the gateway token cannot be fetched — REST stays the
    // fallback source of truth.
    const gatewayToken = await firstValueFrom(this.gatewayTokens.getAccessToken()).catch(
      () => null,
    );

    const options: IHttpConnectionOptions = {
      accessTokenFactory: () => this.authService.getToken() ?? '',
      skipNegotiation: false,
      headers: {
        // Required by the free-tier ngrok gateway (see gateway.interceptor.ts).
        'ngrok-skip-browser-warning': 'true',
        ...(gatewayToken ? { Authorization: `Bearer ${gatewayToken}` } : {}),
        ...(token ? { user: `Bearer ${token}` } : {}),
      },
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
