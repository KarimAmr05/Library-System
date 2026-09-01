import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG } from '../../../core/config/app-config.token';
import { PagedResult } from '../../../shared/models/paged-result.model';
import { toQueryParams } from '../../../shared/util/to-query-params';
import {
  BorrowingRequest,
  BorrowRequestApprove,
  BorrowRequestCreate,
  BorrowRequestDeny,
  RequestsListQuery,
} from './borrowing-request.model';

/**
 * HTTP-only service for borrowing-request endpoints.
 * Uses the documented endpoints exactly; no retries are applied here
 * (the GET-only retry interceptor already guarantees that).
 */
@Injectable({ providedIn: 'root' })
export class RequestsApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  submitBorrow(payload: BorrowRequestCreate): Observable<BorrowingRequest> {
    return this.http.post<BorrowingRequest>(`${this.config.apiUrl}/borrow`, payload);
  }

  getRequests(query: RequestsListQuery): Observable<PagedResult<BorrowingRequest>> {
    return this.http.get<PagedResult<BorrowingRequest>>(`${this.config.apiUrl}/requests`, {
      params: toQueryParams({ ...query }),
    });
  }

  getMyRequests(query: RequestsListQuery): Observable<PagedResult<BorrowingRequest>> {
    return this.http.get<PagedResult<BorrowingRequest>>(`${this.config.apiUrl}/requests/my`, {
      params: toQueryParams({ ...query }),
    });
  }

  getRequest(id: string): Observable<BorrowingRequest> {
    return this.http.get<BorrowingRequest>(`${this.config.apiUrl}/requests/${id}`);
  }

  approve(id: string, payload: BorrowRequestApprove): Observable<BorrowingRequest> {
    return this.http.put<BorrowingRequest>(`${this.config.apiUrl}/requests/${id}/approve`, payload);
  }

  deny(id: string, payload: BorrowRequestDeny): Observable<BorrowingRequest> {
    return this.http.put<BorrowingRequest>(`${this.config.apiUrl}/requests/${id}/deny`, payload);
  }
}
