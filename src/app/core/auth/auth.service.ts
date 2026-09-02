import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay, throwError } from 'rxjs';
import { finalize, map } from 'rxjs/operators';

import { APP_CONFIG } from '../config/app-config.token';
import { AppError } from '../http/app-error';
import { AuthUser, LoginResponse, UserRole } from './auth.models';

const TOKEN_STORAGE_KEY = 'library-system.jwt';
const REFRESH_TOKEN_STORAGE_KEY = 'library-system.refresh-token';

/**
 * Endpoints that must never trigger (or be wrapped by) the refresh flow —
 * they either issue tokens themselves or cannot be retried meaningfully.
 */
const REFRESH_EXEMPT_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/create-admin',
  '/auth/refresh-token',
  '/auth/revoke-refresh-token',
  '/auth/forgot-password',
  '/auth/reset-password',
];

/** Decoded JWT claims relevant to identity. */
interface JwtClaims {
  /** .NET maps claims to long names unless short ones are requested explicitly. */
  readonly [key: string]: unknown;
}

/** Claim keys emitted by the backend JwtService. */
const CLAIM_ROLE = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
const CLAIM_NAMEIDENTIFIER = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier';

/**
 * Authentication operations + JWT handling.
 * Owns token persistence (localStorage) and all JWT decoding so no other
 * layer needs to understand JWT internals.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  /** Shared in-flight refresh call so concurrent 401s rotate the token once. */
  private refreshInFlight$: Observable<LoginResponse> | null = null;

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.config.apiUrl}/auth/login`, {
      email,
      password,
    });
  }

  /**
   * Registers a new account. The backend responds with a fresh session
   * payload, so callers can sign the user in immediately after signup.
   */
  register(fullName: string, email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.config.apiUrl}/auth/register`, {
      fullName,
      email,
      password,
    });
  }

  /**
   * Requests a password-reset email. The response is always generic
   * (anti-enumeration), so callers must not interpret it as "account exists".
   */
  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.config.apiUrl}/auth/forgot-password`, {
      email,
    });
  }

  /** Completes a password reset with the token received by email. */
  resetPassword(
    email: string,
    token: string,
    newPassword: string,
  ): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.config.apiUrl}/auth/reset-password`, {
      email,
      token,
      newPassword,
    });
  }

  /** Permanently deletes the authenticated account (password-confirmed). */
  deleteAccount(password: string): Observable<void> {
    return this.http.request<void>('DELETE', `${this.config.apiUrl}/auth/account`, {
      body: { password },
    });
  }

  /** True when the request targets an endpoint that must not trigger refresh. */
  isRefreshExempt(url: string): boolean {
    return REFRESH_EXEMPT_PATHS.some((path) => url.includes(path));
  }

  /**
   * Exchanges the stored refresh token for a fresh token pair (rotation).
   * Concurrent callers share one in-flight request so the single-use token
   * cannot be consumed twice.
   */
  refreshToken(): Observable<LoginResponse> {
    const stored = this.getRefreshToken();
    if (!stored) {
      return throwError(this.sessionExpiredError());
    }

    this.refreshInFlight$ ??= this.http
      .post<LoginResponse>(`${this.config.apiUrl}/auth/refresh-token`, {
        refreshToken: stored,
      })
      .pipe(
        map((response) => {
          this.storeSession(response);
          return response;
        }),
        finalize(() => (this.refreshInFlight$ = null)),
        shareReplay(1),
      );

    return this.refreshInFlight$;
  }

  /** Revokes the stored refresh token on the backend (logout). Fire-and-forget. */
  revokeRefreshToken(): void {
    const stored = this.getRefreshToken();
    if (!stored) {
      return;
    }

    this.http
      .post(`${this.config.apiUrl}/auth/revoke-refresh-token`, { refreshToken: stored })
      .subscribe({ error: () => undefined }); // best-effort; tokens are cleared regardless
  }

  logout(): void {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    } catch {
      // storage unavailable — nothing to clear
    }
    this.refreshInFlight$ = null;
  }

  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  /** True when a refresh token is available for silent session renewal. */
  hasRefreshToken(): boolean {
    return this.getRefreshToken() !== null;
  }

  getRefreshToken(): string | null {
    try {
      return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  /** Persists the issued access token. Expiry is re-checked on every read via decode. */
  storeToken(token: string): void {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch {
      // storage unavailable — session works until page reload
    }
  }

  /** Persists both tokens of an issued pair (login, register, refresh). */
  storeSession(response: LoginResponse): void {
    this.storeToken(response.token);
    try {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, response.refreshToken);
    } catch {
      // storage unavailable — session works until page reload
    }
  }

  /**
   * Builds the normalized error used when a session cannot be renewed.
   */
  private sessionExpiredError(): AppError {
    return new AppError({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Your session has expired. Please sign in again.',
    });
  }

  /**
   * Decodes the stored token into an AuthUser.
   * Returns null for missing/expired/malformed tokens. When the access token
   * is expired but a refresh token exists, the tokens are kept so the silent
   * refresh flow can restore the session.
   */
  resolveUser(): AuthUser | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    const claims = this.decodeToken(token);
    if (!claims || this.isExpired(claims)) {
      if (claims && !this.hasRefreshToken()) {
        this.logout(); // expired token with no way to renew — clean up
      }
      return null;
    }

    const email = this.readClaim(claims, ['email']) as string | undefined;
    const role = this.resolveRole(claims);
    const userId = this.readClaim(claims, ['sub', CLAIM_NAMEIDENTIFIER]) as string | undefined;

    if (!userId || !role) {
      this.logout();
      return null;
    }

    return { id: userId, email: email ?? '', role };
  }

  /**
   * Decodes a JWT payload without any third-party dependency.
   * Base64url-safe; returns null when the token is malformed or tampered with.
   */
  decodeToken(token: string): JwtClaims | null {
    try {
      const [, payload] = token.split('.');
      if (!payload) {
        return null;
      }

      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

      return JSON.parse(atob(padded)) as JwtClaims;
    } catch {
      return null;
    }
  }

  private isExpired(claims: JwtClaims): boolean {
    const exp = this.readClaim(claims, ['exp']);
    if (exp === undefined || exp === null) {
      return false; // no expiry claim → trust backend's lifetime validation
    }
    return Number(exp) * 1000 <= Date.now();
  }

  /**
   * Reads a claim trying each candidate key. Handles both short names
   * ("sub", "role") and the long URIs the JWT handler emits by default.
   */
  private readClaim(claims: JwtClaims, keys: readonly string[]): unknown {
    for (const key of keys) {
      if (claims[key] !== undefined && claims[key] !== null) {
        return claims[key];
      }
    }
    return undefined;
  }

  private resolveRole(claims: JwtClaims): UserRole | null {
    // Accept ANY of the known encodings rather than trusting token shape.
    return this.coerceRole(this.readClaim(claims, ['role', CLAIM_ROLE]));
  }

  private coerceRole(value: unknown): UserRole | null {
    // The role claim may arrive as a string or an array of strings.
    const candidates = Array.isArray(value) ? value : [value];
    for (const candidate of candidates) {
      if (candidate === 'Admin' || candidate === 'User') {
        return candidate;
      }
    }
    return null;
  }
}
