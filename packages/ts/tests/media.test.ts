import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { DownloadError } from '../src/errors.js';
import { downloadBytes, downloadMedia } from '../src/media.js';
import type { TransportProtocol } from '../src/transport.js';

function transport(statusCode: number, bytes: Buffer, headers: Record<string, string> = {}): TransportProtocol {
  const response = { statusCode, headers, body: Readable.from([bytes]) };
  return { get: async () => response as never, stream: async () => response as never, close: async () => undefined };
}

describe('media downloads', () => {
  it('downloads files, infers an extension, and returns bytes', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'teleglance-'));
    try {
      const photo = await downloadMedia(transport(200, Buffer.from('JPEG'), { 'content-type': 'image/jpeg' }),
        'https://cdn.example/photo.jpg', dir);
      expect(await readFile(photo, 'utf8')).toBe('JPEG');
      const video = await downloadMedia(transport(200, Buffer.from('MP4'), { 'content-type': 'video/mp4' }),
        'https://cdn.example/abc123', dir);
      expect(video).toMatch(/abc123\.mp4$/);
      await expect(downloadBytes(transport(200, Buffer.from('OGG')), 'https://cdn.example/x.ogg'))
        .resolves.toEqual(Buffer.from('OGG'));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects documents, HTTP errors, overwrites, and size-limit violations', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'teleglance-'));
    try {
      const url = 'https://cdn.example/file.jpg';
      await writeFile(join(dir, 'file.jpg'), 'existing');
      await expect(downloadMedia(transport(200, Buffer.from('too large'), { 'content-length': '9' }), url, dir))
        .rejects.toThrow(/already exists/);
      await expect(downloadMedia(transport(200, Buffer.from('too large'), { 'content-length': '9' }), url, dir, undefined, true, 4))
        .rejects.toThrow(/maxBytes/);
      await expect(downloadMedia(transport(404, Buffer.alloc(0)), url, dir, undefined, true)).rejects.toBeInstanceOf(DownloadError);
      await expect(downloadMedia(transport(200, Buffer.alloc(0)), { type: 'document', title: 'a.pdf', extra: null }, dir))
        .rejects.toBeInstanceOf(DownloadError);
      await expect(downloadBytes(transport(200, Buffer.from('12345')), url, 4)).rejects.toThrow(/maxBytes/);
      await expect(downloadBytes(transport(200, Buffer.alloc(0)), url, 0)).rejects.toThrow(/positive/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
