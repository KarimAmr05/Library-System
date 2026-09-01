import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG } from '../../../core/config/app-config.token';
import { PagedResult } from '../../../shared/models/paged-result.model';
import { toQueryParams } from '../../../shared/util/to-query-params';
import { Book, BooksListQuery } from './book.model';

/**
 * HTTP-only service for the /api/books endpoints.
 * No UI state here — that belongs in BooksStore.
 */
@Injectable({ providedIn: 'root' })
export class BooksApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  getBooks(query: BooksListQuery): Observable<PagedResult<Book>> {
    return this.http.get<PagedResult<Book>>(`${this.config.apiUrl}/books`, {
      params: toQueryParams({ ...query }),
    });
  }

  getBook(id: string): Observable<Book> {
    return this.http.get<Book>(`${this.config.apiUrl}/books/${id}`);
  }
}
