import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { switchMap } from 'rxjs';

import { GatewayTokenService, OAUTH_BYPASS } from './gateway-token.service';

/**
 * Attaches the WSO2 gateway access token as `Authorization: Bearer <token>`
 * on every request — the gateway consumes this header for its own
 * authentication (resources without it are rejected with error 900902).
 * The backend JWT travels separately in the `user` header (see
 * auth.interceptor.ts).
 */
export const oauthTokenInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(OAUTH_BYPASS)) {
    return next(req);
  }

  const gatewayTokens = inject(GatewayTokenService);
  return gatewayTokens.getAccessToken().pipe(
    switchMap((token) =>
      next(
        req.clone({
          setHeaders: { Authorization: `Bearer ${token}` },
        }),
      ),
    ),
  );
};
