import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { APP_CONFIG } from './core/config/app-config.token';
import { environment } from '../environments/environment';
import { authInterceptor } from './core/auth/auth.interceptor';
import { apiErrorInterceptor } from './core/http/api-error.interceptor';
import { retryInterceptor } from './core/http/retry.interceptor';
import { gatewayInterceptor } from './core/http/gateway.interceptor';
import { oauthTokenInterceptor } from './core/http/oauth-token.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
    // Order matters: gateway header → auth header → gateway OAuth2 token →
    // error normalization → GET-only retry.
    provideHttpClient(
      withInterceptors([
        gatewayInterceptor,
        authInterceptor,
        oauthTokenInterceptor,
        apiErrorInterceptor,
        retryInterceptor,
      ]),
    ),
    { provide: APP_CONFIG, useValue: environment },
  ],
};
