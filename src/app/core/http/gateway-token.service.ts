import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, finalize, map, of, shareReplay } from 'rxjs';

import { APP_CONFIG } from '../config/app-config.token';

/**
 * HttpContext flag marking the gateway's own token request so the
 * oauth-token interceptor does not try to attach a token to it (recursion).
 */
export const OAUTH_BYPASS = new HttpContextToken<boolean>(() => false);

/** Successful client_credentials response from the WSO2 token endpoint. */
interface GatewayTokenResponse {
  readonly access_token: string;
  readonly expires_in: number;
}

/** Refresh 60s before actual expiry so in-flight requests never use a stale token. */
const EXPIRY_MARGIN_MS = 60_000;

/**
 * Acquires and caches a WSO2 gateway access token (client_credentials grant).
 *
 * Some gateway resources are OAuth2-secured at the WSO2 layer (error 900902
 * "Missing Credentials" otherwise). Requests already carrying the backend's
 * JWT (signed-in users) keep it — see oauth-token.interceptor.ts.
 *
 * Tokens are cached in memory only: never persisted, never logged.
 */
@Injectable({ providedIn: 'root' })
export class GatewayTokenService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  private cachedToken: string | null = null;
  private expiresAtMs = 0;
  private pending$: Observable<string> | null = null;

  /** Emits a valid gateway token, fetching a new one only when needed. */
  getAccessToken(): Observable<string> {
    const cached = this.readCached();
    if (cached) {
      return of(cached);
    }

    // Coalesce concurrent callers onto a single token request.
    this.pending$ ??= this.requestToken().pipe(
      finalize(() => (this.pending$ = null)),
      shareReplay(1),
    );
    return this.pending$;
  }

  private readCached(): string | null {
    return this.cachedToken && Date.now() < this.expiresAtMs ? this.cachedToken : null;
  }

  private requestToken(): Observable<string> {
    const { tokenUrl, clientId, clientSecret } = this.config.oauth;
    const basic = btoa(`${clientId}:${clientSecret}`);

    return this.http
      .post<GatewayTokenResponse>(
        tokenUrl,
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          context: new HttpContext().set(OAUTH_BYPASS, true),
        },
      )
      .pipe(
        map((response) => {
          this.cachedToken = response.access_token;
          this.expiresAtMs = Date.now() + response.expires_in * 1000 - EXPIRY_MARGIN_MS;
          return response.access_token;
        }),
      );
  }
}
