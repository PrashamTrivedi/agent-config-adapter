import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, handleWriteError } from '../app/lib/api';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api()', () => {
  it('parses JSON and sends credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(api('/api/configs')).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/configs',
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('throws ApiError with the backend error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'You do not have permission to modify this resource' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );

    await expect(api('/api/configs/1', { method: 'PUT' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      message: 'You do not have permission to modify this resource',
    });
  });
});

describe('handleWriteError', () => {
  it('opens the auth gate on 401', () => {
    const onUnauthenticated = vi.fn();
    const toast = vi.fn();
    handleWriteError(new ApiError('Authentication required', 401), { onUnauthenticated, toast });
    expect(onUnauthenticated).toHaveBeenCalledOnce();
    expect(toast).not.toHaveBeenCalled();
  });

  it('toasts a clear ownership message on 403', () => {
    const onUnauthenticated = vi.fn();
    const toast = vi.fn();
    handleWriteError(new ApiError('Forbidden', 403), { onUnauthenticated, toast, fallback: 'Save failed' });
    expect(onUnauthenticated).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('You do not have permission to modify this resource.', 'error');
  });

  it('toasts the backend message for other failures', () => {
    const toast = vi.fn();
    handleWriteError(new ApiError('Name is required', 400), { toast, fallback: 'Save failed' });
    expect(toast).toHaveBeenCalledWith('Name is required', 'error');
  });
});
