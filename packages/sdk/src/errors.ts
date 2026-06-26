export type AppErrorCode =
  | "NETWORK_ERROR"
  | "CORS_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "UNKNOWN";

export interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly userMessage: string;
  readonly status?: number;
  readonly details?: unknown;

  constructor(options: {
    code: AppErrorCode;
    message: string;
    userMessage: string;
    status?: number;
    details?: unknown;
    cause?: unknown;
  }) {
    super(options.message, { cause: options.cause });
    this.name = "AppError";
    this.code = options.code;
    this.userMessage = options.userMessage;
    this.status = options.status;
    this.details = options.details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

function statusToCode(status: number): AppErrorCode {
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 400 || status === 422) return "VALIDATION";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "SERVER_ERROR";
  return "UNKNOWN";
}

function statusToUserMessage(status: number, serverMessage?: string): string {
  switch (status) {
    case 401:
      if (serverMessage?.toLowerCase().includes("invalid credentials")) {
        return "Invalid email or password.";
      }
      if (serverMessage?.toLowerCase().includes("missing bearer")) {
        return "Please sign in to continue.";
      }
      return serverMessage || "Your session expired. Please sign in again.";
    case 403:
      return serverMessage || "You don't have permission to perform this action.";
    case 400:
    case 422:
      return serverMessage || "Please check your input and try again.";
    case 429:
      return "Too many requests. Please wait a moment and try again.";
    case 503:
      return "The service is temporarily unavailable. Please try again shortly.";
    default:
      if (status >= 500) {
        return "Something went wrong on our end. Please try again later.";
      }
      return serverMessage || "Something went wrong. Please try again.";
  }
}

export function parseApiError(response: Response, body: unknown): AppError {
  const status = response.status;
  const code = statusToCode(status);
  const parsed = (body && typeof body === "object" ? body : {}) as ApiErrorBody;
  const serverMessage = parsed.error?.message;
  const message = serverMessage || `HTTP ${status}`;

  return new AppError({
    code,
    message,
    userMessage: statusToUserMessage(status, serverMessage),
    status,
    details: parsed.error?.details,
  });
}

export function parseFetchError(err: unknown): AppError {
  if (isAppError(err)) return err;

  const message = err instanceof Error ? err.message : String(err);

  if (err instanceof DOMException && err.name === "AbortError") {
    return new AppError({
      code: "NETWORK_ERROR",
      message,
      userMessage: "The request was cancelled.",
      cause: err,
    });
  }

  if (/timeout|timed out/i.test(message)) {
    return new AppError({
      code: "NETWORK_ERROR",
      message,
      userMessage: "The request timed out. Check your connection and try again.",
      cause: err,
    });
  }

  if (
    message === "Failed to fetch" ||
    message === "NetworkError when attempting to fetch resource." ||
    /cors|cross-origin/i.test(message)
  ) {
    return new AppError({
      code: "CORS_ERROR",
      message,
      userMessage:
        "Unable to reach the API. Check that the server is running and NEXT_PUBLIC_API_URL is set correctly (default: http://localhost:8081/api/v1).",
      cause: err,
    });
  }

  return new AppError({
    code: "NETWORK_ERROR",
    message,
    userMessage: "Unable to connect. Check your internet connection and try again.",
    cause: err,
  });
}

export function formatErrorForUser(error: unknown): string {
  if (isAppError(error)) return error.userMessage;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

export function isRetryable(error: unknown): boolean {
  if (!isAppError(error)) return false;
  return (
    error.code === "NETWORK_ERROR" ||
    error.code === "CORS_ERROR" ||
    error.code === "RATE_LIMITED" ||
    error.code === "SERVER_ERROR"
  );
}
