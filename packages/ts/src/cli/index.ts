#!/usr/bin/env node
import { Command } from 'commander';
import { TeleGlanceClient } from '../client.js';
import { JsonCheckpointStore, recordCheckpoint, type MessageCheckpoint } from '../checkpoints.js';
import { TeleGlanceError, DownloadError } from '../errors.js';
import { appendJson, captureJson, dumpJson } from '../json.js';

export const program = new Command();

async function emit(value: unknown, cmdOpts: { output?: string; overwrite?: boolean }, ndjson = false): Promise<void> {
  if (cmdOpts.output) {
    await captureJson(value, cmdOpts.output, { ndjson, overwrite: cmdOpts.overwrite });
  } else {
    process.stdout.write(dumpJson(value, { ndjson }));
  }
}

program
  .name('teleglance')
  .description('Inspect public Telegram channels through t.me web previews')
  .option('--rate-limit <n>', 'Max requests/second', parseFloat, 1.0)
  .option('--retries <n>', 'Retry attempts', parseInt, 3)
  .option('--timeout <ms>', 'Request timeout in ms', parseInt, 15000)
  .option('--proxy <url>', 'Proxy URL (http:// or socks5://)')
  .option('--base-url <url>', 'Base URL', 'https://t.me');

program
  .command('channel')
  .argument('<channel>', 'Channel username')
  .option('-o, --output <path>', 'Write JSON to a file')
  .option('--overwrite', 'Replace an existing output file')
  .description('Channel metadata as JSON')
  .action(async (channel: string, cmdOpts: any) => {
    const opts = program.opts();
    const client = new TeleGlanceClient({ ...opts });
    try {
      const ch = await client.getChannel(channel);
      await emit(ch, cmdOpts);
    } catch (err) {
      if (err instanceof TeleGlanceError) {
        console.error(err.message);
        process.exit(1);
      }
      throw err;
    } finally {
      await client.close();
    }
  });

program
  .command('messages')
  .argument('<channel>', 'Channel username')
  .option('--limit <n>', 'Max messages', parseInt, 20)
  .option('--before <id>', 'Only messages with smaller id', parseInt)
  .option('--after <id>', 'Stream newer messages oldest first', parseInt)
  .option('--query <text>', 'Server-side text search')
  .option('--ndjson', 'One compact JSON object per line')
  .option('-o, --output <path>', 'Write JSON or NDJSON to a file')
  .option('--overwrite', 'Replace an existing output file')
  .option('--checkpoint <path>', 'Checkpoint file path')
  .option('--checkpoint-key <key>', 'Checkpoint key')
  .description('Dump history newest first, or updates oldest first with --after')
  .action(async (channel: string, cmdOpts: any) => {
    const opts = program.opts();
    if (cmdOpts.before && cmdOpts.after) {
      console.error('--before and --after are mutually exclusive');
      process.exit(1);
    }
    if (cmdOpts.checkpoint && !cmdOpts.ndjson) {
      console.error('--checkpoint requires --ndjson');
      process.exit(1);
    }

    const client = new TeleGlanceClient({ ...opts });
    try {
      const name = TeleGlanceClient.normalizeChannel(channel);
      const direction = cmdOpts.after !== undefined ? 'forward' : 'history';
      const key = cmdOpts.checkpointKey || `messages:${direction}:${name}:${cmdOpts.query || ''}`;

      let store: JsonCheckpointStore | null = null;
      let state: MessageCheckpoint | null = null;

      if (cmdOpts.checkpoint) {
        store = new JsonCheckpointStore(cmdOpts.checkpoint);
        state = (await store.load(key)) || { channel: name, oldestId: null, newestId: null, updatedAt: null };
        if (state.channel !== name) {
          console.error(`Checkpoint ${key} belongs to ${state.channel}, not ${name}`);
          process.exit(1);
        }
      }

      const collected: any[] = [];

      if (cmdOpts.after !== undefined) {
        const cursor = state && state.newestId !== null ? state.newestId : cmdOpts.after;
        for await (const msg of client.iterNewMessages(name, { after: cursor, limit: cmdOpts.limit })) {
          collected.push(msg);
          if (store && state) {
            state = recordCheckpoint(state, msg);
            await store.save(key, state);
          }
        }
      } else {
        const cursor = state && state.oldestId !== null ? state.oldestId : cmdOpts.before;
        for await (const msg of client.iterMessages(name, { limit: cmdOpts.limit, before: cursor, query: cmdOpts.query })) {
          collected.push(msg);
          if (store && state) {
            state = recordCheckpoint(state, msg);
            await store.save(key, state);
          }
        }
      }

      await emit(collected, cmdOpts, cmdOpts.ndjson);
    } catch (err) {
      if (err instanceof TeleGlanceError) {
        console.error(err.message);
        process.exit(1);
      }
      throw err;
    } finally {
      await client.close();
    }
  });

program
  .command('search')
  .argument('<channel>', 'Channel username')
  .argument('<query>', 'Search query')
  .option('--limit <n>', 'Max messages', parseInt, 20)
  .option('--ndjson', 'One compact JSON object per line')
  .option('-o, --output <path>', 'Write JSON or NDJSON to a file')
  .option('--overwrite', 'Replace an existing output file')
  .description('Search within a channel')
  .action(async (channel: string, query: string, cmdOpts: any) => {
    const opts = program.opts();
    const client = new TeleGlanceClient({ ...opts });
    try {
      const collected: any[] = [];
      for await (const msg of client.search(channel, query, { limit: cmdOpts.limit })) {
        collected.push(msg);
      }
      await emit(collected, cmdOpts, cmdOpts.ndjson);
    } catch (err) {
      if (err instanceof TeleGlanceError) {
        console.error(err.message);
        process.exit(1);
      }
      throw err;
    } finally {
      await client.close();
    }
  });

program
  .command('watch')
  .argument('<channel>', 'Channel username')
  .option('--interval <sec>', 'Poll interval in seconds', parseFloat, 30.0)
  .option('--since-id <id>', 'Only yield messages with bigger id', parseInt)
  .option('--checkpoint <path>', 'Checkpoint file path')
  .option('--checkpoint-key <key>', 'Checkpoint key')
  .option('-o, --output <path>', 'Write NDJSON to a file')
  .option('--overwrite', 'Replace an existing output file')
  .description('Stream new posts as NDJSON until interrupted')
  .action(async (channel: string, cmdOpts: any) => {
    const opts = program.opts();
    const client = new TeleGlanceClient({ ...opts });
    try {
      if (cmdOpts.output) await captureJson([], cmdOpts.output, { ndjson: true, overwrite: cmdOpts.overwrite });
      const name = TeleGlanceClient.normalizeChannel(channel);
      const key = cmdOpts.checkpointKey || `watch:${name}`;

      let store: JsonCheckpointStore | null = null;
      let state: MessageCheckpoint | null = null;
      let since: number | undefined = cmdOpts.sinceId;

      if (cmdOpts.checkpoint) {
        store = new JsonCheckpointStore(cmdOpts.checkpoint);
        state = (await store.load(key)) || { channel: name, oldestId: null, newestId: null, updatedAt: null };
        if (state.channel !== name) {
          console.error(`Checkpoint ${key} belongs to ${state.channel}, not ${name}`);
          process.exit(1);
        }
        since = state.newestId !== null ? state.newestId : cmdOpts.sinceId;
      }

      for await (const msg of client.watch(name, { interval: cmdOpts.interval * 1000, sinceId: since })) {
        if (cmdOpts.output) await appendJson(msg, cmdOpts.output);
        else process.stdout.write(dumpJson([msg], { ndjson: true }));
        if (store && state) {
          state = recordCheckpoint(state, msg);
          await store.save(key, state);
        }
      }
    } catch (err) {
      if (err instanceof TeleGlanceError) {
        console.error(err.message);
        process.exit(1);
      }
      throw err;
    } finally {
      await client.close();
    }
  });

program
  .command('download')
  .argument('<channel>', 'Channel username')
  .argument('<msgId>', 'Message ID', parseInt)
  .option('-o, --output <dir>', 'Output directory', '.')
  .option('--overwrite', 'Overwrite existing files')
  .option('--max-bytes <n>', 'Max download size', parseInt)
  .description('Download all media attached to a message')
  .action(async (channel: string, msgId: number, cmdOpts: any) => {
    const opts = program.opts();
    const client = new TeleGlanceClient({ ...opts });
    try {
      const msg = await client.getMessage(channel, msgId);
      if (!msg.media.length) {
        console.error('No media on this message');
        return;
      }
      for (const item of msg.media) {
        try {
          const path = await client.downloadMedia(item, cmdOpts.output, {
            overwrite: cmdOpts.overwrite,
            maxBytes: cmdOpts.maxBytes,
          });
          console.log(path);
        } catch (err) {
          if (err instanceof DownloadError) {
            console.error(`Skipped ${item.type}: ${err.message}`);
          } else {
            throw err;
          }
        }
      }
    } catch (err) {
      if (err instanceof TeleGlanceError) {
        console.error(err.message);
        process.exit(1);
      }
      throw err;
    } finally {
      await client.close();
    }
  });

export function run(argv = process.argv): void {
  program.parse(argv);
}
