import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG } from '../../../core/config/app-config.token';
import { PagedResult } from '../../../shared/models/paged-result.model';
import { toQueryParams } from '../../../shared/util/to-query-params';
import { Notification, NotificationsQuery } from './notification.model';

/**
 * HTTP-only service for the /api/notifications endpoints.
 * Real-time pushes come via NotificationHubService and are merged in
 * NotificationsStore — never here.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  getNotifications(query: NotificationsQuery): Observable<PagedResult<Notification>> {
    return this.http.get<PagedResult<Notification>>(`${this.config.apiUrl}/notifications`, {
      params: toQueryParams({ ...query }),
    });
  }

  markAsRead(id: string): Observable<Notification> {
    return this.http.put<Notification>(`${this.config.apiUrl}/notifications/${id}/read`, null);
  }
}
