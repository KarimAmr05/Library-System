/**
 * WSO2/ngrok integration gateway. All traffic (REST + SignalR) goes through
 * the gateway; the backend is never addressed directly.
 *
 * The ngrok free tier serves an HTML browser-warning page (ERR_NGROK_6024)
 * to browser-originated requests lacking the `ngrok-skip-browser-warning`
 * header — the gateway interceptor adds it to every API call.
 *
 * Some gateway resources (e.g. /auth/register) are WSO2 OAuth2-secured and
 * reject calls without a gateway-issued token (error 900902). The
 * GatewayTokenService obtains one via the client_credentials grant and the
 * oauth-token interceptor attaches it to otherwise-unauthenticated requests.
 *
 * Known gateway behavior: WSO2 does not preserve backend HTTP status codes on
 * some /auth resources (login failures arrive as HTTP 200 with an error body).
 * AuthService normalizes those payloads into AppError.
 */
const GATEWAY_URL = 'https://cohesive-roundup-demeanor.ngrok-free.dev';

export const environment = {
  production: false,
  apiUrl: `${GATEWAY_URL}/api/1.0.0/api`,
  hubUrl: `${GATEWAY_URL}/api/1.0.0/hubs/notifications`,
  oauth: {
    tokenUrl: `${GATEWAY_URL}/token-api/1.0.0/oauth2/token`,
    clientId: '2RRDcb4GDF6mGRDAzlly6KSnX_Ea',
    clientSecret: 'dcZ0hSoVHZ3rt70BPkJlfGfD7iQa',
  },
} as const;
