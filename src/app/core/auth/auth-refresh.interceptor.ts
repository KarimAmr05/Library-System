import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { AppError } from '../http/app-error';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

/**
 * Extracts the HTTP status from either a raw HttpErrorResponse or the
 * normalized AppError produced by apiErrorInterceptor (which runs downstream
 * of this interceptor, so 401s usually arrive already normalized).
 */
function statusOf(error: unknown): number | undefined {
  if (error instanceof AppError) {
    return error.status;
  }
  if (error instanceof HttpErrorResponse) {
    return error.status;
  }
  return undefined;
}

/**
 * Silent session renewal: on a 401 from a protected endpoint, exchanges the
 * stored refresh token for a fresh pair (rotation) and replays the original
 * request with the new access token. Concurrent 401s share one in-flight
 * refresh; if renewal fails the session is cleared and the error propagates.
 * Auth endpoints (login/register/refresh themselves) are exempt.
 */
export const authRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const authStore = inject(AuthStore);

  return next(req).pipe(
    catchError((error: unknown) => {
      const is401 = statusOf(error) === 401;
      const exempt = authService.isRefreshExempt(req.url);
      const canRefresh = is401 && !exempt && authService.hasRefreshToken();

      if (!canRefresh) {
        return throwError(() => error);
      }

      return authStore.refreshSession().pipe(
        switchMap(() => {
          // Re-attach the fresh access token; the auth interceptor already
          // ran for this request, so the header must be updated here.
          const token = authService.getToken();
          const retryReq = token
            ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
            : req;
          return next(retryReq);
        }),
      );
    }),
  );
};
