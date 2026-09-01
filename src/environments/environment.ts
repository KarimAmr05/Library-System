/**
 * WSO2/ngrok integration gateway. All traffic (REST + SignalR) goes through
 * the gateway; the backend is never addressed directly.
 * See environment.development.ts for the per-environment override notes.
 */
const GATEWAY_URL = 'https://cohesive-roundup-demeanor.ngrok-free.dev';

export const environment = {
  production: true,
  apiUrl: `${GATEWAY_URL}/api/1.0.0/api`,
  hubUrl: `${GATEWAY_URL}/api/1.0.0/hubs/notifications`,
  oauth: {
    tokenUrl: `${GATEWAY_URL}/token-api/1.0.0/oauth2/token`,
    clientId: '2RRDcb4GDF6mGRDAzlly6KSnX_Ea',
    clientSecret: 'dcZ0hSoVHZ3rt70BPkJlfGfD7iQa',
  },
} as const;
