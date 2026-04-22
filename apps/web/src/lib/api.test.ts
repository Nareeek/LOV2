import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

test('does not send json content-type for empty-body post commands', async () => {
  const calls: Array<{ input: RequestInfo | URL; init: RequestInit | undefined }> = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });

      if (String(input).endsWith('/auth/csrf')) {
        return jsonResponse({ csrfToken: 'csrf-test-token' });
      }

      return jsonResponse({ ok: true });
    }),
  );

  const { apiClient } = await import('./api.js');
  await apiClient.logout();

  const logoutHeaders = new Headers(calls[1]?.init?.headers);
  expect(logoutHeaders.has('Content-Type')).toBe(false);
  expect(logoutHeaders.get('x-csrf-token')).toBe('csrf-test-token');
  expect(calls[1]?.init?.body).toBeUndefined();
});

test('keeps json content-type when a request has a json body', async () => {
  const calls: Array<{ input: RequestInfo | URL; init: RequestInit | undefined }> = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });

      if (String(input).endsWith('/auth/csrf')) {
        return jsonResponse({ csrfToken: 'csrf-test-token' });
      }

      return jsonResponse({ user: { id: 'u1' } });
    }),
  );

  const { apiClient } = await import('./api.js');
  await apiClient.login({ email: 'hero@example.test', password: 'StrongPass123!' });

  const loginHeaders = new Headers(calls[1]?.init?.headers);
  expect(loginHeaders.get('Content-Type')).toBe('application/json');
  expect(loginHeaders.get('x-csrf-token')).toBe('csrf-test-token');
  expect(calls[1]?.init?.body).toBe(JSON.stringify({ email: 'hero@example.test', password: 'StrongPass123!' }));
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
