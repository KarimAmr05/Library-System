import { Routes } from '@angular/router';

import { requireAuth } from '../../core/auth/auth.guard';
import { BooksStore } from './data/books.store';

/**
 * Books feature routes. Authenticated users and admins both may browse;
 * the guard also covers direct URL access for unauthenticated visitors.
 */
export const BOOKS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [requireAuth()],
    providers: [BooksStore],
    title: 'Books — Library System',
    loadComponent: () =>
      import('./pages/books-list-page.component').then((m) => m.BooksListPageComponent),
  },
  {
    path: ':id',
    canActivate: [requireAuth()],
    title: 'Book details — Library System',
    loadComponent: () =>
      import('./pages/book-detail-page.component').then((m) => m.BookDetailPageComponent),
  },
];
