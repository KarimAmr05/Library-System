import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG } from '../config/app-config.token';
import { AppError } from '../http/app-error';
import { AuthUser, LoginResponse, UserRole } from './auth.models';

const TOKEN_STORAGE_KEY = 'library-system.jwt';

/**
 * Error payload the gateway delivers with an HTTP 200 status: WSO2 does not
 * always preserve backend status codes, so auth failures can arrive "OK".
 */
interface GatewayErrorPayload {
  readonly code?: string;
  readonly message?: string;
  readonly description?: string;
  readonly status?: number;
  readonly traceId?: string;
}

function isGatewayErrorPayload(value: unknown): value is GatewayErrorPayload {
  const record = value as Record<string, unknown> | null;
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof record?.['token'] !== 'string' &&
    typeof record?.['message'] === 'string'
  );
}

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

  login(email: string, password: string): Observable<LoginResponse> {
    return this.assertSession(
      this.http.post<LoginResponse>(`${this.config.apiUrl}/auth/login`, {
        email,
        password,
      }),
    );
  }

  /**
   * Registers a new account. The backend responds with a fresh session
   * payload, so callers can sign the user in immediately after signup.
   */
  register(fullName: string, email: string, password: string): Observable<LoginResponse> {
    return this.assertSession(
      this.http.post<LoginResponse>(`${this.config.apiUrl}/auth/register`, {
        fullName,
        email,
        password,
      }),
    );
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

  /**
   * Detects gateway-level auth failures delivered as HTTP 200 (WSO2 swallows
   * backend status codes) and rethrows them as AppError so the existing
   * error handling — status mapping, login-page messaging — stays intact.
   */
  private assertSession(source: Observable<LoginResponse>): Observable<LoginResponse> {
    return new Observable<LoginResponse>((subscriber) => {
      const subscription = source.subscribe({
        next: (response) => {
          if (typeof response?.token === 'string' && response.token.length > 0) {
            subscriber.next(response);
            subscriber.complete();
            return;
          }

          subscriber.error(this.toAppError(response));
        },
        error: (err) => subscriber.error(err),
      });

      return () => subscription.unsubscribe();
    });
  }

  /** Builds an AppError from a gateway error payload (or a missing token). */
  private toAppError(payload: unknown): AppError {
    if (isGatewayErrorPayload(payload)) {
      const message = payload.message || payload.description || '';
      return new AppError({
        status: typeof payload.status === 'number' ? payload.status : 401,
        code: payload.code ?? 'UNAUTHORIZED',
        message,
        traceId: payload.traceId,
      });
    }

    return new AppError({
      status: 500,
      code: 'UNKNOWN_ERROR',
      message: 'Authentication failed. Please try again.',
    });
  }

  logout(): void {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // storage unavailable — nothing to clear
    }
  }

  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  /** Persists the issued token. Expiry is re-checked on every read via decode. */
  storeToken(token: string): void {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch {
      // storage unavailable — session works until page reload
    }
  }

  /**
   * Decodes the stored token into an AuthUser.
   * Returns null for missing/expired/malformed tokens.
   */
  resolveUser(): AuthUser | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    const claims = this.decodeToken(token);
    if (!claims || this.isExpired(claims)) {
      if (claims) {
        this.logout(); // expired token — clean up
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
