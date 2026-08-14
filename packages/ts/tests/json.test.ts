import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { appendJson, captureJson, dumpJson } from '../src/json.js';

describe('JSON capture', () => {
  it('serializes values and captures JSON without replacing files by default', async () => {
    const path = join(await mkdtemp(join(tmpdir(), 'teleglance-json-')), 'capture.json');
    expect(dumpJson({ when: new Date('2026-01-01T00:00:00Z') })).toContain('2026-01-01T00:00:00.000Z');
    await captureJson([{ id: 1 }], path);
    await expect(readFile(path, 'utf8')).resolves.toBe('[\n  {\n    "id": 1\n  }\n]\n');
    await expect(captureJson([], path)).rejects.toThrow('Destination already exists');
  });

  it('writes NDJSON captures and appends stream records', async () => {
    const path = join(await mkdtemp(join(tmpdir(), 'teleglance-json-')), 'capture.ndjson');
    await captureJson([{ id: 1 }, { id: 2 }], path, { ndjson: true });
    await appendJson({ id: 3 }, path);
    await expect(readFile(path, 'utf8')).resolves.toBe('{"id":1}\n{"id":2}\n{"id":3}\n');
  });
});
