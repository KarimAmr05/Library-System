/** Book domain model — mirrors the documented API schema exactly. */
export interface Book {
  id: string;
  isbn: string | null;
  title: string;
  author: string;
  category: string | null;
  isAvailable: boolean;
  totalCopies: number;
  availableCopies: number;
  createdAt: string;
  updatedAt: string;
}

export type BookSortField = 'title' | 'author' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

/** Mirrors the documented BooksListQuery. */
export interface BookListFilters {
  search: string;
  availableOnly: boolean;
  sortBy: BookSortField | null;
  sortOrder: SortOrder;
}

/** Query accepted by the books API (camelCase, matching the wire contract). */
export interface BooksListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  availableOnly?: boolean;
  sortBy?: string;
  sortOrder?: string;
}
