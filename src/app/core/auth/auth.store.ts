import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AuthUser, LoginResponse, UserRole } from './auth.models';
import { AuthService } from './auth.service';

/**
 * Centralized authentication state (signals).
 * Single source of truth for currentUser/role/isAuthenticated.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly authService = inject(AuthService);

  private readonly _currentUser = signal<AuthUser | null>(this.authService.resolveUser());

  /** Currently authenticated user or null. Restored from the persisted JWT on startup. */
  readonly currentUser = this._currentUser.asReadonly();

  readonly isAuthenticated = computed(() => this._currentUser() !== null);

  readonly role = computed<UserRole | null>(() => this._currentUser()?.role ?? null);

  readonly isAdmin = computed(() => this._currentUser()?.role === 'Admin');

  /** Authenticates and centralizes session state; errors surface as AppError. */
  login(email: string, password: string) {
    return this.establishSession(this.authService.login(email, password));
  }

  /**
   * Registers a new account and signs the user in with the returned session;
   * errors surface as AppError (409 when the email is already taken).
   */
  register(fullName: string, email: string, password: string) {
    return this.establishSession(this.authService.register(fullName, email, password));
  }

  /**
   * Silently renews the session using the stored refresh token (rotation).
   * Concurrent callers share one in-flight request; failures clear the session.
   */
  refreshSession(): Observable<AuthUser> {
    return this.establishSession(this.authService.refreshToken()).pipe(
      catchError((error: unknown) => {
        this.logout();
        return throwError(() => error);
      }),
    );
  }

  private establishSession(source: Observable<{ token: string }>) {
    return source.pipe(
      map((response) => {
        // AuthService already persisted both tokens of a refreshed pair;
        // persist here for login/register responses (idempotent).
        const full = response as LoginResponse;
        if (full.refreshToken) {
          this.authService.storeSession(full);
        } else {
          this.authService.storeToken(response.token);
        }

        // Trust the freshly-decoded token over the response body for identity.
        const user = this.authService.resolveUser();

        if (!user) {
          throw new Error('Issued session token could not be verified.');
        }

        this._currentUser.set(user);
        return user;
      }),
    );
  }

  /** Clears the local session and revokes the refresh token on the backend. */
  logout(): void {
    this.authService.revokeRefreshToken();
    this.authService.logout();
    this._currentUser.set(null);
  }

  /**
   * Permanently deletes the signed-in account, then clears the local session.
   * Errors surface as AppError (401 when the confirmation password is wrong).
   */
  deleteAccount(password: string) {
    return new Observable<void>((subscriber) => {
      const subscription = this.authService.deleteAccount(password).subscribe({
        next: () => {
          this.logout();
          subscriber.next();
          subscriber.complete();
        },
        error: (err) => subscriber.error(err),
      });

      return () => subscription.unsubscribe();
    });
  }
}
