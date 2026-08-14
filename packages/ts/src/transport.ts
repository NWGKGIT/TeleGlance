/**
 * HTTP transport: throttling, retries and hooks on top of undici.
 *
 * All requests the library makes go through Transport, so polite
 * behavior (rate limiting, backoff, honest Retry-After handling) applies
 * uniformly — including media downloads.
 */

import { request, type Dispatcher } from 'undici';
import { RateLimited, RequestFailed } from './errors.js';

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

export type RequestHook = (req: { url: string; headers: Record<string, string> }) => Promise<void>;
export type ResponseHook = (res: { statusCode: number; headers: Record<string, string | string[] | undefined> }) => Promise<void>;

export interface TransportProtocol {
  get(url: string, params?: Record<string, string>): Promise<Dispatcher.ResponseData>;
  stream(url: string): Promise<Dispatcher.ResponseData>;
  close(): Promise<void>;
}

export class Transport implements TransportProtocol {
  private minInterval: number;
  private retries: number;
  private backoffBase: number;
  private backoffMax: number;
  private timeout: number;
  private headers: Record<string, string>;
  private requestHooks: RequestHook[];
  private responseHooks: ResponseHook[];
  private lock = Promise.resolve();
  private lastRequest = 0;

  constructor(opts: {
    rateLimit?: number;
    retries?: number;
    backoffBase?: number;
    backoffMax?: number;
    timeout?: number;
    proxy?: string;
    headers?: Record<string, string>;
    requestHooks?: RequestHook[];
    responseHooks?: ResponseHook[];
  } = {}) {
    const rateLimit = opts.rateLimit ?? 1.0;
    this.retries = opts.retries ?? 3;
    this.backoffBase = opts.backoffBase ?? 0.5;
    this.backoffMax = opts.backoffMax ?? 30.0;
    this.timeout = opts.timeout ?? 15000;

    if (rateLimit < 0) throw new Error('rateLimit must be non-negative');
    if (this.retries < 0) throw new Error('retries must be non-negative');
    if (this.backoffBase < 0 || this.backoffMax < 0) throw new Error('backoff values must be non-negative');
    if (this.timeout <= 0) throw new Error('timeout must be positive');

    this.minInterval = rateLimit > 0 ? 1000 / rateLimit : 0;
    this.headers = { ...DEFAULT_HEADERS, ...(opts.headers || {}) };
    this.requestHooks = opts.requestHooks || [];
    this.responseHooks = opts.responseHooks || [];
  }

  private async throttle(): Promise<void> {
    if (!this.minInterval) return;
    await (this.lock = this.lock.then(async () => {
      const now = performance.now();
      const wait = this.lastRequest + this.minInterval - now;
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      this.lastRequest = performance.now();
    }));
  }

  private backoffDelay(attempt: number, retryAfter?: number): number {
    if (retryAfter !== undefined) return Math.min(retryAfter * 1000, this.backoffMax * 1000);
    const delay = Math.min(this.backoffBase * 2 ** attempt, this.backoffMax);
    return (delay + Math.random() * (delay / 4)) * 1000;
  }

  private retryAfter(headers: Record<string, string | string[] | undefined>): number | undefined {
    const value = headers['retry-after'];
    const str = Array.isArray(value) ? value[0] : value;
    if (!str) return undefined;
    const num = parseFloat(str);
    if (!isNaN(num)) return num;
    try {
      const date = new Date(str);
      return Math.max(0, (date.getTime() - Date.now()) / 1000);
    } catch {
      return undefined;
    }
  }

  async get(url: string, params?: Record<string, string>): Promise<Dispatcher.ResponseData> {
    const fullUrl = params ? `${url}?${new URLSearchParams(params)}` : url;
    let lastExc: Error | undefined;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      await this.throttle();
      for (const hook of this.requestHooks) await hook({ url: fullUrl, headers: this.headers });

      try {
        const res = await request(fullUrl, { method: 'GET', headers: this.headers, headersTimeout: this.timeout, bodyTimeout: this.timeout });
        for (const hook of this.responseHooks) await hook({ statusCode: res.statusCode, headers: res.headers });

        if (res.statusCode === 429) {
          const retryAfter = this.retryAfter(res.headers);
          if (attempt === this.retries) throw new RateLimited(retryAfter);
          await new Promise((r) => setTimeout(r, this.backoffDelay(attempt, retryAfter)));
          continue;
        }

        if (res.statusCode >= 500 && attempt < this.retries) {
          await new Promise((r) => setTimeout(r, this.backoffDelay(attempt)));
          continue;
        }

        if (res.statusCode >= 500) throw new RequestFailed(fullUrl, res.statusCode);
        return res;
      } catch (err) {
        if (err instanceof RateLimited || err instanceof RequestFailed) throw err;
        lastExc = err as Error;
        if (attempt === this.retries) throw new RequestFailed(fullUrl, undefined, err as Error);
        await new Promise((r) => setTimeout(r, this.backoffDelay(attempt)));
      }
    }
    throw lastExc || new RateLimited();
  }

  async stream(url: string): Promise<Dispatcher.ResponseData> {
    return this.get(url);
  }

  async close(): Promise<void> {
    // undici pool cleanup happens automatically
  }
}
