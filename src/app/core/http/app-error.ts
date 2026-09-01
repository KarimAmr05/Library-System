/**
 * Normalized application error. Every HTTP failure surface becomes an AppError
 * so the rest of the app never needs to understand raw backend payloads.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: readonly { field?: string; message: string }[];
  readonly traceId?: string;

  constructor(init: {
    status: number;
    code: string;
    message: string;
    details?: { field?: string; message: string }[];
    traceId?: string;
  }) {
    super(init.message);
    this.name = 'AppError';
    this.status = init.status;
    this.code = init.code;
    this.details = init.details ?? [];
    this.traceId = init.traceId;
  }

  /** True for validation/business-rule failures the user can fix (400/409/422). */
  get isClientFixable(): boolean {
    return [400, 409, 422].includes(this.status);
  }
}
