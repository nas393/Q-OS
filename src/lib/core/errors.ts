export type QErrorCode =
  | "INVALID_REQUEST"
  | "UNAUTHORIZED"
  | "CONTEXT_UNAVAILABLE"
  | "PROVIDER_UNAVAILABLE"
  | "STREAM_FAILED"
  | "INTERNAL";

export class QCoreError extends Error {
  readonly code: QErrorCode;
  readonly status: number;
  readonly retryable: boolean;

  constructor(code: QErrorCode, message: string, status = 500, retryable = false) {
    super(message);
    this.name = "QCoreError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

export function toQCoreError(error: unknown): QCoreError {
  if (error instanceof QCoreError) return error;
  return new QCoreError(
    "INTERNAL",
    error instanceof Error ? error.message : "Q Core request failed",
    500,
    false
  );
}
