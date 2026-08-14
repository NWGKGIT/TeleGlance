/** JSON serialization and file capture helpers. */
import { mkdir, writeFile, appendFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname } from 'node:path';

export function dumpJson(value: unknown, opts: { ndjson?: boolean } = {}): string {
  if (opts.ndjson) {
    if (typeof value === 'string' || !value || typeof (value as Iterable<unknown>)[Symbol.iterator] !== 'function') {
      throw new TypeError('ndjson output requires an iterable of values');
    }
    return Array.from(value as Iterable<unknown>, (item) => JSON.stringify(item)).join('\n') + '\n';
  }
  return `${JSON.stringify(value, null, 2)}\n`;
}

export async function captureJson(
  value: unknown,
  path: string,
  opts: { ndjson?: boolean; overwrite?: boolean } = {},
): Promise<string> {
  if (!opts.overwrite) {
    try {
      await access(path, constants.F_OK);
      throw new Error(`Destination already exists: ${path}`);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, dumpJson(value, opts), 'utf8');
  return path;
}

/** Append one value as an NDJSON record to a capture created with captureJson. */
export async function appendJson(value: unknown, path: string): Promise<void> {
  await appendFile(path, dumpJson([value], { ndjson: true }), 'utf8');
}
