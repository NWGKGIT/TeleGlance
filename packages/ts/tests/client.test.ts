import { describe, expect, it, vi } from 'vitest';
import { TeleGlanceClient } from '../src/client.js';
import { ChannelNotFound, ChannelPrivate, ParseError } from '../src/errors.js';
import type { TransportProtocol } from '../src/transport.js';
import { fixture } from './helpers.js';

const message = (id: number): string => `
  <div class="tgme_widget_message" data-post="testchan/${id}">
    <div class="tgme_widget_message_text">message ${id}</div>
  </div>`;

const feed = (...messages: string[]): string => `
  <section class="tgme_channel_info"><div class="tgme_channel_info_header_title">Test Channel</div></section>
  ${messages.join('')}`;

function transportFor(responder: (url: string, params?: Record<string, string>) => string): TransportProtocol {
  return {
    get: vi.fn(async (url: string, params?: Record<string, string>) => ({
      statusCode: 200,
      body: { text: async () => responder(url, params) },
      headers: {},
    })) as never,
    stream: vi.fn() as never,
    close: vi.fn(async () => undefined),
  };
}

describe('TeleGlanceClient', () => {
  it('normalizes channels and paginates history newest first', async () => {
    const transport = transportFor((_url, params) => {
      if (!params?.before) return feed(message(101), message(102));
      if (params.before === '101') return feed(message(99), message(100));
      return feed();
    });
    const client = new TeleGlanceClient({ transport, rateLimit: 0 });

    expect(TeleGlanceClient.normalizeChannel('https://t.me/s/TestChan/10')).toBe('testchan');
    const ids: number[] = [];
    for await (const item of client.iterMessages('testchan')) ids.push(item.id);
    expect(ids).toEqual([102, 101, 100, 99]);
    await client.close();
  });

  it('distinguishes private, missing, and unrecognized pages', async () => {
    const cases: Array<[string, unknown]> = [
      ['<div class="tgme_page_title">Private Channel</div>', ChannelPrivate],
      ['<div class="tgme_landing"><div class="tl_page">Not found</div></div>', ChannelNotFound],
      ['<html><body>intercepted</body></html>', ParseError],
    ];

    for (const [html, error] of cases) {
      const client = new TeleGlanceClient({ transport: transportFor(() => html), rateLimit: 0 });
      await expect(client.getMessages('testchan')).rejects.toBeInstanceOf(error as new (...args: never[]) => Error);
    }
  });

  it('passes cursors and queries, fetches embeds, and validates inputs', async () => {
    const transport = transportFor((url) => url.endsWith('/42') ? fixture('embed_message.html') : fixture('feed_page.html'));
    const client = new TeleGlanceClient({ transport, rateLimit: 0 });
    const channel = await client.getChannel('@testchan');
    expect(channel.counts.subscribers).toBe(36600);
    await client.getMessages('testchan', { before: 250, query: 'news' });
    expect(transport.get).toHaveBeenLastCalledWith('https://t.me/s/testchan', { before: '250', q: 'news' });
    await expect(client.getMessage('testchan', 42)).resolves.toMatchObject({ id: 42, text: 'Single embedded message' });
    expect(() => TeleGlanceClient.normalizeChannel('https://t.me/')).toThrow();
    await expect(client.getMessages('testchan', { before: 0 })).rejects.toThrow(/positive/);
    await expect(client.getMessages('testchan', { before: 2, after: 1 })).rejects.toThrow(/mutually exclusive/);
  });

  it('drains forward pages oldest first and honors a zero limit without requests', async () => {
    const transport = transportFor((_url, params) => {
      if (params?.after === '100') return feed(message(101), message(102));
      if (params?.after === '102') return feed(message(102), message(103), message(104));
      return feed();
    });
    const client = new TeleGlanceClient({ transport, rateLimit: 0 });
    const ids: number[] = [];
    for await (const item of client.iterNewMessages('testchan', { after: 100 })) ids.push(item.id);
    expect(ids).toEqual([101, 102, 103, 104]);
    const calls = (transport.get as ReturnType<typeof vi.fn>).mock.calls.length;
    expect((await client.iterMessages('testchan', { limit: 0 }).next()).done).toBe(true);
    expect((transport.get as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(calls);
  });
});
