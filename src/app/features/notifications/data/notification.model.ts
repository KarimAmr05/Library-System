import { UserRole } from '../../../core/auth/auth.models';

/** Notification domain model — mirrors the documented API schema exactly. */
export interface Notification {
  id: string;
  recipientUserId: string;
  recipientRole: UserRole;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export type NotificationType =
  'BorrowRequestCreated' | 'BorrowDueReminder' | 'RequestApproved' | 'RequestDenied';

/** Mirrors the documented NotificationsQuery. */
export interface NotificationsQuery {
  page?: number;
  pageSize?: number;
  recipientUserId?: string;
  recipientRole?: string;
  isRead?: boolean;
}
