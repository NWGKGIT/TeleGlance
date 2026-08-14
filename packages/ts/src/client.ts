import type { Message } from './models/message.js';
import type { Channel } from './models/channel.js';
import type { Media } from './models/media.js';
import {
  ChannelNotFound,
  ChannelPrivate,
  InvalidChannel,
  MessageNotFound,
  ParseError,
  RequestFailed,
} from './errors.js';
import { PageKind, classifyPage, parseChannel } from './parsing/channel.js';
import { parseFeed, defaultRegistry } from './parsing/message.js';
import { DEFAULT_SELECTORS, type Selectors } from './parsing/selectors.js';
import type { ParserRegistry } from './parsing/registry.js';
import { Transport, type TransportProtocol, type RequestHook, type ResponseHook } from './transport.js';
import { watch } from './live.js';
import { downloadMedia, downloadBytes } from './media.js';

const CHANNEL_RE = /^[A-Za-z0-9_]+$/;

export class TeleGlanceClient {
  private baseUrl: string;
  private selectors: Selectors;
  private registry: ParserRegistry;
  private strictParsing: boolean;
  private transport: TransportProtocol;

  constructor(opts: {
    baseUrl?: string;
    rateLimit?: number;
    retries?: number;
    timeout?: number;
    proxy?: string;
    headers?: Record<string, string>;
    requestHooks?: RequestHook[];
    responseHooks?: ResponseHook[];
    registry?: ParserRegistry;
    selectors?: Selectors;
    transport?: TransportProtocol;
    strictParsing?: boolean;
  } = {}) {
    this.baseUrl = (opts.baseUrl || 'https://t.me').replace(/\/$/, '');
    this.selectors = opts.selectors || DEFAULT_SELECTORS;
    this.registry = opts.registry || defaultRegistry(this.selectors);
    this.strictParsing = opts.strictParsing || false;
    this.transport = opts.transport || new Transport({
      rateLimit: opts.rateLimit,
      retries: opts.retries,
      timeout: opts.timeout,
      proxy: opts.proxy,
      headers: opts.headers,
      requestHooks: opts.requestHooks,
      responseHooks: opts.responseHooks,
    });
  }

  async close(): Promise<void> {
    await this.transport.close();
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }

  static normalizeChannel(channel: string): string {
    let value = channel.trim();
    value = value.replace(/^https?:\/\//, '');
    value = value.replace(/^t\.me\//, '').replace(/^s\//, '');
    value = value.replace(/^@/, '').replace(/^\/|\/$/g, '');
    const [firstPathSegment = ''] = value.split('/');
    value = firstPathSegment.split('?')[0] ?? '';
    if (!value || !CHANNEL_RE.test(value)) {
      throw new InvalidChannel(channel);
    }
    return value.toLowerCase();
  }

  private checkStatus(res: { statusCode: number; url?: string }): void {
    if (res.statusCode >= 400) {
      throw new RequestFailed(res.url || '<unknown>', res.statusCode);
    }
  }

  private async fetchFeedPage(channel: string, params: Record<string, string>): Promise<string> {
    const res = await this.transport.get(`${this.baseUrl}/s/${channel}`, params);
    if (res.statusCode === 404) throw new ChannelNotFound(channel);
    this.checkStatus({ statusCode: res.statusCode });
    const html = await res.body.text();
    const kind = classifyPage(html, this.selectors);
    if (kind === PageKind.FEED) return html;
    if (kind === PageKind.CARD) throw new ChannelPrivate(channel);
    if (kind === PageKind.NOT_FOUND) throw new ChannelNotFound(channel);
    throw new ParseError(`Unrecognized successful page for channel ${channel}`);
  }

  async getChannel(channel: string): Promise<Channel> {
    const name = TeleGlanceClient.normalizeChannel(channel);
    const res = await this.transport.get(`${this.baseUrl}/s/${name}`);
    if (res.statusCode === 404) throw new ChannelNotFound(name);
    this.checkStatus({ statusCode: res.statusCode });
    const html = await res.body.text();
    const parsed = parseChannel(html, name, this.selectors);
    if (!parsed) {
      if (classifyPage(html, this.selectors) === PageKind.NOT_FOUND) {
        throw new ChannelNotFound(name);
      }
      throw new ParseError(`Could not parse channel metadata for ${name}`);
    }
    return parsed;
  }

  async getMessages(channel: string, opts: { before?: number; after?: number; query?: string } = {}): Promise<Message[]> {
    const name = TeleGlanceClient.normalizeChannel(channel);
    if (opts.before !== undefined && opts.before <= 0) throw new Error('before must be positive');
    if (opts.after !== undefined && opts.after < 0) throw new Error('after must be non-negative');
    if (opts.before !== undefined && opts.after !== undefined) throw new Error('before and after are mutually exclusive');

    const params: Record<string, string> = {};
    if (opts.before !== undefined) params.before = String(opts.before);
    if (opts.after !== undefined) params.after = String(opts.after);
    if (opts.query) params.q = opts.query;

    const html = await this.fetchFeedPage(name, params);
    return parseFeed(html, this.registry, this.selectors, { strict: this.strictParsing });
  }

  async *iterMessages(channel: string, opts: { limit?: number; before?: number; query?: string } = {}): AsyncGenerator<Message> {
    if (opts.limit !== undefined && opts.limit < 0) throw new Error('limit must be non-negative');
    if (opts.limit === 0) return;

    let yielded = 0;
    let cursor = opts.before;

    while (true) {
      let page = await this.getMessages(channel, { before: cursor, query: opts.query });
      if (cursor !== undefined) {
        page = page.filter((m) => m.id < cursor!);
      }
      if (!page.length) return;

      for (let i = page.length - 1; i >= 0; i--) {
        yield page[i]!;
        yielded++;
        if (opts.limit !== undefined && yielded >= opts.limit) return;
      }

      cursor = Math.min(...page.map((m) => m.id));
    }
  }

  async *iterNewMessages(channel: string, opts: { after: number; limit?: number }): AsyncGenerator<Message> {
    if (opts.after < 0) throw new Error('after must be non-negative');
    if (opts.limit !== undefined && opts.limit < 0) throw new Error('limit must be non-negative');
    if (opts.limit === 0) return;

    let cursor = opts.after;
    let yielded = 0;

    while (true) {
      const page = await this.getMessages(channel, { after: cursor });
      const fresh = page.filter((m) => m.id > cursor).sort((a, b) => a.id - b.id);
      if (!fresh.length) return;

      for (const message of fresh) {
        yield message;
        yielded++;
        if (opts.limit !== undefined && yielded >= opts.limit) return;
      }

      const nextCursor = Math.max(...fresh.map((m) => m.id));
      if (nextCursor <= cursor) return;
      cursor = nextCursor;
    }
  }

  async getMessage(channel: string, msgId: number): Promise<Message> {
    const name = TeleGlanceClient.normalizeChannel(channel);
    if (msgId <= 0) throw new Error('msgId must be positive');

    const res = await this.transport.get(`${this.baseUrl}/${name}/${msgId}`, { embed: '1', mode: 'tme' });
    if (res.statusCode === 404) throw new MessageNotFound(name, msgId);
    this.checkStatus({ statusCode: res.statusCode });

    const html = await res.body.text();
    const kind = classifyPage(html, this.selectors);
    if (kind === PageKind.NOT_FOUND) throw new MessageNotFound(name, msgId);

    const messages = parseFeed(html, this.registry, this.selectors, { strict: this.strictParsing });
    const found = messages.find((m) => m.id === msgId);
    if (found) return found;

    if (kind === PageKind.UNKNOWN) {
      throw new ParseError(`Unrecognized successful embed page for ${name}/${msgId}`);
    }
    throw new MessageNotFound(name, msgId);
  }

  search(channel: string, query: string, opts: { limit?: number } = {}): AsyncGenerator<Message> {
    return this.iterMessages(channel, { limit: opts.limit, query });
  }

  watch(channel: string, opts: { interval?: number; sinceId?: number } = {}): AsyncGenerator<Message> {
    return watch(this, TeleGlanceClient.normalizeChannel(channel), opts.interval, opts.sinceId);
  }

  async downloadMedia(media: Media | string, dest?: string, opts: { filename?: string; overwrite?: boolean; maxBytes?: number } = {}): Promise<string> {
    return downloadMedia(this.transport, media, dest, opts.filename, opts.overwrite, opts.maxBytes);
  }

  async downloadBytes(media: Media | string, opts: { maxBytes?: number } = {}): Promise<Buffer> {
    return downloadBytes(this.transport, media, opts.maxBytes);
  }
}

export const Client = TeleGlanceClient;
