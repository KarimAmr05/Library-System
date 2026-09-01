import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/** WSO2 gateway OAuth2 client (client_credentials grant). */
export interface GatewayOAuthConfig {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
}

/** Application-wide, environment-provided configuration. */
export interface AppConfig {
  apiUrl: string;
  hubUrl: string;
  oauth: GatewayOAuthConfig;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG', {
  providedIn: 'root',
  factory: () => ({
    apiUrl: environment.apiUrl,
    hubUrl: environment.hubUrl,
    oauth: environment.oauth,
  }),
});
