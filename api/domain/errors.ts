export type ApiErrorCode =
  | "CONFLICT"
  | "FORBIDDEN"
  | "INTERNAL_ERROR"
  | "INSUFFICIENT_FUNDS"
  | "INVALID_STATE"
  | "NOT_FOUND"
  | "UNAUTHENTICATED"
  | "VALIDATION_ERROR";

export class DomainError extends Error {
  readonly code: ApiErrorCode;
  readonly status: 400 | 401 | 403 | 404 | 409 | 500;

  constructor(
    code: ApiErrorCode,
    message: string,
    status: 400 | 401 | 403 | 404 | 409 | 500,
  ) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.status = status;
  }
}
