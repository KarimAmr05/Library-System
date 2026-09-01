import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

import { AppError } from './app-error';

const STATUS_TO_CODE: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'BUSINESS_RULE_VIOLATION',
  500: 'INTERNAL_ERROR',
};

const USER_FRIENDLY_MESSAGES: Record<number, string> = {
  0: 'Unable to reach the server. Please check your connection.',
  400: 'The submitted information was invalid.',
  401: 'Your session has expired. Please sign in again.',
  403: "You don't have permission to perform this action.",
  404: 'The requested item was not found.',
  409: 'This action conflicts with the current state of the item.',
  422: 'This action cannot be completed right now.',
  500: 'Something went wrong on our side. Please try again later.',
};

interface BackendErrorPayload {
  code?: string;
  message?: string;
  details?: { field?: string; message?: string }[];
  traceId?: string;
}

function isBackendPayload(value: unknown): value is BackendErrorPayload {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Normalizes all HTTP failures into a single AppError representation.
 * Preserves code/message/details/traceId when the backend supplies them,
 * falls back to documented status-code mappings otherwise.
 */
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      // Prefer backend payload, fall back to generic mappings.
      const payload =
        isBackendPayload(error.error) &&
        typeof (error.error as BackendErrorPayload).message === 'string'
          ? (error.error as BackendErrorPayload)
          : {};

      const status = error.status;

      if (status === 0 || status === undefined || isNaN(status)) {
        return throwError(
          () =>
            new AppError({
              status: 0,
              code: 'NETWORK_ERROR',
              message: USER_FRIENDLY_MESSAGES[0],
            }),
        );
      }

      return throwError(
        () =>
          new AppError({
            status,
            code: payload.code ?? STATUS_TO_CODE[status] ?? 'UNKNOWN_ERROR',
            message:
              // Expose backend business messages only where they help users.
              payload.message && (status === 409 || status === 422 || status === 404)
                ? payload.message
                : (USER_FRIENDLY_MESSAGES[status] ?? USER_FRIENDLY_MESSAGES[500]),
            details: payload.details?.map((d) => ({ field: d.field, message: d.message ?? '' })),
            traceId: payload.traceId,
          }),
      );
    }),
  );
};
