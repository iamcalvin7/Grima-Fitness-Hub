/**
 * Shared credentials-based API client.
 * All requests go through the artifact base path and include the
 * HTTP-only session cookie (credentials: "include").
 */

const API_BASE = `${import.meta.env.BASE_URL}api`;

export class ApiError extends Error {
  readonly status: number;
  /** Optional per-field validation details from the server. */
  readonly fields?: Record<string, string>;

  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
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
    const obj = (data && typeof data === 'object') ? data as { error?: unknown; fields?: unknown } : null;
    const message = typeof obj?.error === 'string' ? obj.error : 'Something went wrong. Please try again.';
    const fields = (obj?.fields && typeof obj.fields === 'object')
      ? obj.fields as Record<string, string>
      : undefined;
    throw new ApiError(res.status, message, fields);
  }

  return data as T;
}
