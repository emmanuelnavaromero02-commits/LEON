import { AxiosError } from 'axios';
import type { ApiErrorBody } from '@/types/api';

/**
 * Extract a human-readable message from an unknown error, preferring the
 * FastAPI `detail` field when present. Falls back to the axios message and
 * finally to a caller-supplied default.
 */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorBody | undefined;
    const detail = data?.detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
    if (Array.isArray(detail) && detail.length > 0 && typeof detail[0]?.msg === 'string') {
      return detail[0].msg;
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
