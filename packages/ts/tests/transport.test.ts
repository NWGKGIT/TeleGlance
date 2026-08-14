import { describe, expect, it, vi } from 'vitest';

interface MockResponse {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
}

const mock = vi.hoisted(() => ({
  calls: [] as Array<{ url: string; options: { headers: Record<string, string> } }>,
  responses: [] as Array<MockResponse | Error>,
}));

vi.mock('undici', () => ({
  request: vi.fn(async (url: string, options: { headers: Record<string, string> }) => {
    mock.calls.push({ url, options });
    const response = mock.responses.shift();
    if (!response) throw new Error('No mock response configured');
    if (response instanceof Error) throw response;
    return response;
  }),
}));

import { RateLimited, RequestFailed } from '../src/errors.js';
import { Transport } from '../src/transport.js';

const response = (statusCode: number, headers: MockResponse['headers'] = {}): MockResponse => ({ statusCode, headers });

describe('Transport', () => {
  it('retries 5xx and 429 responses, then returns the successful response', async () => {
    mock.calls.length = 0;
    mock.responses.push(response(500), response(200));
    expect((await new Transport({ rateLimit: 0, retries: 2, backoffBase: 0 }).get('https://t.me/s/x')).statusCode).toBe(200);
    expect(mock.calls).toHaveLength(2);

    mock.calls.length = 0;
    mock.responses.push(response(429, { 'retry-after': '0' }), response(200));
    expect((await new Transport({ rateLimit: 0, retries: 2, backoffBase: 0 }).get('https://t.me/s/x')).statusCode).toBe(200);
    expect(mock.calls).toHaveLength(2);
  });

  it('returns 4xx responses but gives typed failures after exhausted retryable responses', async () => {
    mock.responses.push(response(404));
    expect((await new Transport({ rateLimit: 0 }).get('https://t.me/s/x')).statusCode).toBe(404);
    mock.responses.push(response(503), response(503));
    await expect(new Transport({ rateLimit: 0, retries: 1, backoffBase: 0 }).get('https://t.me/s/x'))
      .rejects.toBeInstanceOf(RequestFailed);
    mock.responses.push(response(429, { 'retry-after': '7' }));
    await expect(new Transport({ rateLimit: 0, retries: 0 }).get('https://t.me/s/x')).rejects.toMatchObject({
      retryAfter: 7,
    } satisfies Partial<RateLimited>);
  });

  it('runs hooks, applies headers, and validates configuration', async () => {
    mock.calls.length = 0;
    mock.responses.push(response(200));
    const seen: Record<string, unknown> = {};
    await new Transport({
      rateLimit: 0,
      headers: { 'X-Custom': '1' },
      requestHooks: [async (request) => { seen.url = request.url; seen.header = request.headers['X-Custom']; }],
      responseHooks: [async (response) => { seen.status = response.statusCode; }],
    }).get('https://t.me/s/x');
    expect(seen).toMatchObject({ url: 'https://t.me/s/x', header: '1', status: 200 });
    expect(mock.calls[0]!.options.headers['User-Agent']).toContain('Mozilla');
    for (const options of [{ rateLimit: -1 }, { retries: -1 }, { timeout: 0 }, { backoffBase: -1 }]) {
      expect(() => new Transport(options)).toThrow();
    }
  });
});
