import type { SessionPayload } from './types';

export class ApiError extends Error {
  status: number;
  body: Record<string, unknown>;

  constructor(message: string, status: number, body: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  const isForm = typeof FormData !== 'undefined' && init.body instanceof FormData;
  if (init.body && !isForm && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    throw new ApiError(
      typeof body.error === 'string' ? body.error : res.statusText,
      res.status,
      body
    );
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export function getSession() {
  return api<SessionPayload | null>('/api/auth/get-session');
}

export function trackEvent(event: string, metadata?: Record<string, unknown>) {
  return fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, metadata }),
    credentials: 'include',
    keepalive: true,
  }).catch(() => undefined);
}
