import { RequestStatus } from '../../../shared/ui/status-badge.component';

/**
 * Borrowing request domain model — mirrors the documented API schema exactly.
 */
export interface BorrowingRequest {
  id: string;
  bookId: string;
  bookTitle: string;
  userId: string;
  status: RequestStatus;
  borrowingPeriodDays: number;
  requestedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  denyReason: string | null;
}

/** Mirrors the documented BorrowRequestCreate (1–30 day period). */
export interface BorrowRequestCreate {
  bookId: string;
  userId: string;
  borrowingPeriodDays: number;
}

/** Mirrors the documented BorrowRequestApprove. */
export interface BorrowRequestApprove {
  approvedByAdminId: string;
  approvalNote?: string;
}

/** Mirrors the documented BorrowRequestDeny — reason is required. */
export interface BorrowRequestDeny {
  deniedByAdminId: string;
  reason: string;
}

/** Mirrors the documented RequestsListQuery. */
export interface RequestsListQuery {
  page?: number;
  pageSize?: number;
  status?: string;
  userId?: string;
  bookId?: string;
  fromDate?: string;
  toDate?: string;
}
