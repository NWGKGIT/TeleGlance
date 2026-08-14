import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { JsonCheckpointStore, recordCheckpoint } from '../src/checkpoints.js';
import { CheckpointError } from '../src/errors.js';
import type { Message } from '../src/models/message.js';

const message = (id: number, channel = 'one'): Message => ({
  id, channel, url: `https://t.me/${channel}/${id}`, date: null, views: null, viewsStr: null,
  author: null, text: '', html: null, markdown: null, entities: [], media: [], forwardedFrom: null,
  replyTo: null, edited: false, reactions: [], comments: null, commentsStr: null, rawHtml: '',
});

describe('checkpoints', () => {
  it('round-trips independent keys and preserves the versioned format', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'teleglance-'));
    try {
      const path = join(dir, 'state.json');
      const store = new JsonCheckpointStore(path);
      const first = recordCheckpoint({ channel: 'one', oldestId: null, newestId: null, updatedAt: null }, message(10));
      const second = recordCheckpoint({ channel: 'two', oldestId: null, newestId: null, updatedAt: null }, message(20, 'two'));
      await store.save('history:one', first);
      await store.save('watch:two', second);
      await expect(store.load('history:one')).resolves.toEqual(first);
      await expect(store.load('watch:two')).resolves.toEqual(second);
      await expect(store.load('missing')).resolves.toBeNull();
      expect(JSON.parse(await readFile(path, 'utf8')).version).toBe(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('tracks both directions and rejects channel mismatches', () => {
    let state = { channel: 'one', oldestId: null, newestId: null, updatedAt: null };
    for (const id of [10, 8, 12]) state = recordCheckpoint(state, message(id));
    expect(state).toMatchObject({ oldestId: 8, newestId: 12 });
    expect(() => recordCheckpoint(state, message(1, 'two'))).toThrow(CheckpointError);
  });

  it('wraps malformed files in a typed error', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'teleglance-'));
    try {
      const path = join(dir, 'state.json');
      await writeFile(path, 'not json');
      await expect(new JsonCheckpointStore(path).load('x')).rejects.toBeInstanceOf(CheckpointError);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
