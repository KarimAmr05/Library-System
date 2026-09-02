/**
 * Local development configuration.
 *
 * All traffic uses relative URLs, which `ng serve` proxies to the ASP.NET
 * backend via proxy.conf.json (/api and /hubs → https://localhost:7060,
 * with websocket support for SignalR). No WSO2/gateway layer involved:
 * the backend JWT travels in the standard `Authorization` header.
 */
export const environment = {
  production: false,
  apiUrl: '/api',
  hubUrl: '/hubs/notifications',
} as const;
