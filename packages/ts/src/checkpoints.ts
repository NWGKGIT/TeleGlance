import { promises as fs } from 'fs';
import { dirname } from 'path';
import { CheckpointError } from './errors.js';
import type { Message } from './models/message.js';

export interface MessageCheckpoint {
  channel: string;
  oldestId: number | null;
  newestId: number | null;
  updatedAt: string | null;
}

export function recordCheckpoint(checkpoint: MessageCheckpoint, message: Message): MessageCheckpoint {
  if (message.channel !== checkpoint.channel) {
    throw new CheckpointError(`Checkpoint for ${checkpoint.channel} cannot record ${message.channel}`);
  }
  const oldest = checkpoint.oldestId === null ? message.id : Math.min(checkpoint.oldestId, message.id);
  const newest = checkpoint.newestId === null ? message.id : Math.max(checkpoint.newestId, message.id);
  return {
    channel: checkpoint.channel,
    oldestId: oldest,
    newestId: newest,
    updatedAt: new Date().toISOString(),
  };
}

export interface CheckpointStore {
  load(key: string): Promise<MessageCheckpoint | null>;
  save(key: string, checkpoint: MessageCheckpoint): Promise<void>;
}

export class JsonCheckpointStore implements CheckpointStore {
  private path: string;
  private lock = Promise.resolve();

  constructor(path: string) {
    this.path = path;
  }

  private async read(): Promise<{ version: number; checkpoints: Record<string, unknown> }> {
    try {
      const content = await fs.readFile(this.path, 'utf-8');
      const data = JSON.parse(content);
      if (typeof data !== 'object' || !data || typeof data.checkpoints !== 'object') {
        throw new CheckpointError(`Invalid checkpoint file structure: ${this.path}`);
      }
      return data;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return { version: 1, checkpoints: {} };
      }
      if (err instanceof CheckpointError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new CheckpointError(`Cannot read checkpoint file ${this.path}: ${message}`);
    }
  }

  async load(key: string): Promise<MessageCheckpoint | null> {
    await this.lock;
    const data = await this.read();
    const raw = data.checkpoints[key];
    if (!raw) return null;
    return raw as MessageCheckpoint;
  }

  private async write(key: string, checkpoint: MessageCheckpoint): Promise<void> {
    const data = await this.read();
    data.checkpoints[key] = checkpoint;
    await fs.mkdir(dirname(this.path), { recursive: true });
    const temp = `${this.path}.tmp`;
    try {
      await fs.writeFile(temp, JSON.stringify(data, null, 2) + '\n', 'utf-8');
      await fs.rename(temp, this.path);
    } catch (err: unknown) {
      await fs.unlink(temp).catch(() => {});
      const message = err instanceof Error ? err.message : String(err);
      throw new CheckpointError(`Cannot write checkpoint file ${this.path}: ${message}`);
    }
  }

  async save(key: string, checkpoint: MessageCheckpoint): Promise<void> {
    if (!key) throw new CheckpointError('Checkpoint key cannot be empty');
    await (this.lock = this.lock.then(() => this.write(key, checkpoint)));
  }
}
