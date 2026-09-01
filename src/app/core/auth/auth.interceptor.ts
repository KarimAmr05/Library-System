import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthService } from './auth.service';

/**
 * Attaches the backend JWT to outgoing API requests in the `user` header.
 * The gateway consumes `Authorization` for WSO2 integration auth (see
 * oauth-token.interceptor.ts), so the backend token travels in `user`
 * and is mapped back to `Authorization` by the gateway.
 * Services never add auth headers manually.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (!token) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { user: `Bearer ${token}` },
    }),
  );
};
