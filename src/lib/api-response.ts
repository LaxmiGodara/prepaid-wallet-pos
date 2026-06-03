import type { ApiResponse, FieldError, PaginationMeta } from "@/types";

export function buildSuccessResponse<T>(
  message: string,
  data: T,
  meta?: PaginationMeta | null
): ApiResponse<T> {
  return {
    success: true,
    message,
    data,
    meta: meta ?? null,
    errors: null,
  };
}

export function buildErrorResponse(
  message: string,
  errors?: FieldError[] | null
): ApiResponse<null> {
  return {
    success: false,
    message,
    data: null,
    meta: null,
    errors: errors ?? null,
  };
}