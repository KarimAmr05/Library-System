/**
 * Production configuration.
 *
 * Relative URLs assume the app is served behind a reverse proxy that maps
 * /api and /hubs (websocket) to the ASP.NET backend, mirroring the local
 * proxy.conf.json setup. The backend JWT travels in the standard
 * `Authorization` header.
 */
export const environment = {
  production: true,
  apiUrl: '/api',
  hubUrl: '/hubs/notifications',
} as const;
