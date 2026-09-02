import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG } from '../../../core/config/app-config.token';
import { PagedResult } from '../../../shared/models/paged-result.model';
import { toQueryParams } from '../../../shared/util/to-query-params';
import {
  CreateUserRequest,
  ManagedUser,
  UpdateUserRoleRequest,
  UpdateUserStatusRequest,
  UsersQuery,
} from './user.model';

/**
 * HTTP-only service for the /api/admin/users endpoints (admin-authorized).
 * No UI state here — that belongs in UsersStore.
 */
@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  getUsers(query: UsersQuery): Observable<PagedResult<ManagedUser>> {
    return this.http.get<PagedResult<ManagedUser>>(`${this.config.apiUrl}/admin/users`, {
      params: toQueryParams({ ...query }),
    });
  }

  createUser(request: CreateUserRequest): Observable<ManagedUser> {
    return this.http.post<ManagedUser>(`${this.config.apiUrl}/admin/users`, request);
  }

  updateUserRole(id: string, request: UpdateUserRoleRequest): Observable<ManagedUser> {
    return this.http.put<ManagedUser>(
      `${this.config.apiUrl}/admin/users/${id}/role`,
      request,
    );
  }

  updateUserStatus(id: string, request: UpdateUserStatusRequest): Observable<ManagedUser> {
    return this.http.put<ManagedUser>(
      `${this.config.apiUrl}/admin/users/${id}/status`,
      request,
    );
  }
}
