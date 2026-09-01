import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { OAUTH_BYPASS } from './gateway-token.service';

/**
 * Header required by the free-tier ngrok gateway: without it, ngrok answers
 * browser-originated requests with its HTML interstitial (ERR_NGROK_6024,
 * HTTP 200 + text/html) instead of proxying to WSO2, which would corrupt
 * every JSON response. Harmless when the gateway is not ngrok.
 *
 * The gateway token request is exempt: `ngrok-skip-browser-warning` is not in
 * the token API's CORS allow-list, and the interstitial only affects GET
 * navigations — not this POST. Sending it would fail the CORS preflight.
 */
export const gatewayInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(OAUTH_BYPASS)) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { 'ngrok-skip-browser-warning': 'true' },
    }),
  );
};
