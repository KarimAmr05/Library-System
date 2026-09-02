import { UserRole } from '../../../core/auth/auth.models';

/** Safe user projection returned by the admin user-management API. */
export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

/** Mirrors the documented UsersQuery parameters. */
export interface UsersQuery {
  page?: number;
  pageSize?: number;
  search?: string;
}

/** Payload for POST /api/admin/users. */
export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

/** Payload for PUT /api/admin/users/{id}/role. */
export interface UpdateUserRoleRequest {
  role: UserRole;
}

/** Payload for PUT /api/admin/users/{id}/status. */
export interface UpdateUserStatusRequest {
  isActive: boolean;
}
