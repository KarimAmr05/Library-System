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
import { authRefreshInterceptor } from './core/auth/auth-refresh.interceptor';
import { apiErrorInterceptor } from './core/http/api-error.interceptor';
import { retryInterceptor } from './core/http/retry.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
    // Order matters: auth header → silent 401-refresh retry →
    // error normalization → GET-only retry.
    provideHttpClient(
      withInterceptors([
        authInterceptor,
        authRefreshInterceptor,
        apiErrorInterceptor,
        retryInterceptor,
      ]),
    ),
    { provide: APP_CONFIG, useValue: environment },
  ],
};
