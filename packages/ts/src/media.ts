import { promises as fs } from 'fs';
import { dirname, basename, extname } from 'path';
import { randomBytes } from 'crypto';
import type { TransportProtocol } from './transport.js';
import { DownloadError } from './errors.js';
import type { Media } from './models/media.js';

export function resolveUrl(media: Media | string): string {
  if (typeof media === 'string') return media;
  const url = (media as any).url;
  if (typeof url === 'string' && url) return url;
  const kind = media.type;
  if (kind === 'document') {
    throw new DownloadError('t.me previews do not expose direct URLs for document attachments');
  }
  throw new DownloadError(`${kind} media has no downloadable URL`);
}

function filenameFor(url: string, contentType: string | null): string {
  const urlPath = new URL(url, 'https://t.me').pathname;
  let pathName = basename(urlPath);
  let name: string;

  if (pathName && pathName.includes('.')) {
    name = pathName;
  } else {
    const mime = contentType?.split(';')[0]?.trim();
    const ext = mime ? extFromMime(mime) : '.bin';
    name = (pathName || 'media') + ext;
  }

  if (name.length > 200) {
    const ext = extname(name);
    const stemLimit = 200 - ext.length;
    const stem = basename(name, ext);
    name = stem.slice(0, stemLimit) + ext;
  }

  return name;
}

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
    'audio/ogg': '.ogg',
    'audio/mpeg': '.mp3',
  };
  return map[mime] || '.bin';
}

function validateMaxBytes(maxBytes: number | undefined): void {
  if (maxBytes !== undefined && maxBytes <= 0) {
    throw new Error('maxBytes must be positive');
  }
}

function declaredTooLarge(contentLength: string | undefined, maxBytes: number | undefined): boolean {
  if (!contentLength || maxBytes === undefined) return false;
  const size = parseInt(contentLength, 10);
  return !isNaN(size) && size > maxBytes;
}

export async function downloadBytes(
  transport: TransportProtocol,
  media: Media | string,
  maxBytes?: number,
): Promise<Buffer> {
  validateMaxBytes(maxBytes);
  const url = resolveUrl(media);
  const streamData = await transport.stream(url);
  const { statusCode, headers, body } = streamData;

  if (statusCode !== 200) {
    throw new DownloadError(`GET ${url} returned ${statusCode}`);
  }

  const contentLength = Array.isArray(headers['content-length'])
    ? headers['content-length'][0]
    : headers['content-length'];

  if (declaredTooLarge(contentLength, maxBytes)) {
    throw new DownloadError(`Download exceeds maxBytes=${maxBytes}`);
  }

  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of body) {
    const buf = Buffer.from(chunk);
    size += buf.length;
    if (maxBytes !== undefined && size > maxBytes) {
      throw new DownloadError(`Download exceeds maxBytes=${maxBytes}`);
    }
    chunks.push(buf);
  }

  return Buffer.concat(chunks);
}

export async function downloadMedia(
  transport: TransportProtocol,
  media: Media | string,
  dest?: string,
  filename?: string,
  overwrite?: boolean,
  maxBytes?: number,
): Promise<string> {
  validateMaxBytes(maxBytes);
  const url = resolveUrl(media);
  const streamData = await transport.stream(url);
  const { statusCode, headers, body } = streamData;

  if (statusCode !== 200) {
    throw new DownloadError(`GET ${url} returned ${statusCode}`);
  }

  const contentLength = Array.isArray(headers['content-length'])
    ? headers['content-length'][0]
    : headers['content-length'];

  if (declaredTooLarge(contentLength, maxBytes)) {
    throw new DownloadError(`Download exceeds maxBytes=${maxBytes}`);
  }

  const destPath = dest || process.cwd();
  let target: string;

  try {
    const stats = await fs.stat(destPath);
    if (stats.isDirectory()) {
      const contentType = Array.isArray(headers['content-type'])
        ? headers['content-type'][0]
        : headers['content-type'];
      const safeFilename = filename ? basename(filename) : filenameFor(url, contentType || null);
      target = `${destPath}/${safeFilename}`;
    } else {
      target = destPath;
    }
  } catch {
    if (destPath.includes('.') && !destPath.endsWith('/')) {
      target = destPath;
    } else {
      await fs.mkdir(destPath, { recursive: true });
      const contentType = Array.isArray(headers['content-type'])
        ? headers['content-type'][0]
        : headers['content-type'];
      const safeFilename = filename ? basename(filename) : filenameFor(url, contentType || null);
      target = `${destPath}/${safeFilename}`;
    }
  }

  await fs.mkdir(dirname(target), { recursive: true });

  if (!overwrite) {
    try {
      await fs.access(target);
      throw new DownloadError(`Destination already exists: ${target}`);
    } catch (err: any) {
      if (err instanceof DownloadError) throw err;
    }
  }

  const tempPath = `${dirname(target)}/.${basename(target)}.${randomBytes(8).toString('hex')}.tmp`;
  let size = 0;

  try {
    const writeStream = await fs.open(tempPath, 'w');
    try {
      for await (const chunk of body) {
        const buf = Buffer.from(chunk);
        size += buf.length;
        if (maxBytes !== undefined && size > maxBytes) {
          throw new DownloadError(`Download exceeds maxBytes=${maxBytes}`);
        }
        await writeStream.write(buf);
      }
      await writeStream.sync();
    } finally {
      await writeStream.close();
    }

    if (!overwrite) {
      try {
        await fs.access(target);
        throw new DownloadError(`Destination already exists: ${target}`);
      } catch (err: any) {
        if (err instanceof DownloadError) throw err;
      }
    }

    await fs.rename(tempPath, target);
  } catch (err) {
    await fs.unlink(tempPath).catch(() => {});
    throw err;
  }

  return target;
}
