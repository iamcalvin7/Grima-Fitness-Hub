/**
 * Shared credentials-based API client.
 * All requests go through the artifact base path and include the
 * HTTP-only session cookie (credentials: "include").
 */

const API_BASE = `${import.meta.env.BASE_URL}api`;

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: 'include',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(0, 'Network error. Please check your connection and try again.');
  }

  let data: unknown = null;
  try { data = await res.json(); } catch { /* non-JSON response body */ }

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && typeof (data as { error?: unknown }).error === 'string')
        ? (data as { error: string }).error
        : 'Something went wrong. Please try again.';
    throw new ApiError(res.status, message);
  }

  return data as T;
}
