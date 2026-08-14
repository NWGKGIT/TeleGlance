import type { TeleGlanceClient } from './client.js';
import type { Message } from './models/message.js';
import { ParseError, RateLimited, RequestFailed } from './errors.js';

export async function* watch(
  client: TeleGlanceClient,
  channel: string,
  interval = 30000,
  sinceId?: number,
): AsyncGenerator<Message> {
  if (interval < 0) throw new Error('interval must be non-negative');
  if (sinceId !== undefined && sinceId < 0) throw new Error('sinceId must be non-negative');

  let cursor = sinceId;
  if (cursor === undefined) {
    const page = await client.getMessages(channel);
    cursor = page.length > 0 ? Math.max(...page.map((m) => m.id)) : 0;
  }

  while (true) {
    await new Promise((r) => setTimeout(r, interval));
    try {
      for await (const message of client.iterNewMessages(channel, { after: cursor })) {
        cursor = message.id;
        yield message;
      }
    } catch (err) {
      if (err instanceof RequestFailed && err.statusCode !== null && err.statusCode < 500) {
        throw err;
      }
      if (err instanceof RateLimited || err instanceof ParseError || err instanceof RequestFailed) {
        console.warn(`watch(${channel}): poll failed, will retry:`, err.message);
      } else {
        throw err;
      }
    }
  }
}
