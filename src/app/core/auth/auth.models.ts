export type UserRole = 'User' | 'Admin';

/** Identity extracted from the JWT (no sensitive data stored client-side). */
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface LoginResponse {
  token: string;
  expiresAtUtc: string;
  refreshToken: string;
  refreshTokenExpiresAtUtc: string;
  userId: string;
  email: string;
  role: UserRole;
}
