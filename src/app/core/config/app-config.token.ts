import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/** Application-wide, environment-provided configuration. */
export interface AppConfig {
  apiUrl: string;
  hubUrl: string;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG', {
  providedIn: 'root',
  factory: () => ({
    apiUrl: environment.apiUrl,
    hubUrl: environment.hubUrl,
  }),
});
