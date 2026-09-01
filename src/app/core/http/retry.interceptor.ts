import { HttpErrorResponse, HttpEvent, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { Observable, throwError, timer, catchError } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 500;

function isRetryable(error: unknown): boolean {
  if (error instanceof HttpErrorResponse) {
    return error.status === 0 || error.status >= 500;
  }
  return false; // never retry client errors or normalized AppErrors
}

/**
 * Retries idempotent GET requests only, with exponential backoff.
 *
 * Mutating operations (POST /api/borrow, approve/deny PUTs) are deliberately
 * excluded: the API defines no idempotency keys, so blind retries could
 * duplicate borrowing requests or repeat approval/denial decisions.
 */
export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET') {
    return next(req);
  }

  const attempt = (
    currentReq: HttpRequest<unknown>,
    remaining: number,
  ): Observable<HttpEvent<unknown>> =>
    next(currentReq).pipe(
      catchError((error: unknown) => {
        if (remaining > 0 && isRetryable(error)) {
          return timer(BASE_DELAY_MS * Math.pow(2, MAX_RETRIES - remaining)).pipe(
            mergeMap(() => attempt(currentReq, remaining - 1)),
          );
        }
        return throwError(() => error);
      }),
    );

  return attempt(req, MAX_RETRIES);
};
