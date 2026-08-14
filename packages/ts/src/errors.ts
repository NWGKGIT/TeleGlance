/**
 * Base error class for all TeleGlance errors.
 */
export class TeleGlanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TeleGlanceError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Invalid channel identifier format.
 */
export class InvalidChannel extends TypeError {
  readonly channel: string;

  constructor(channel: string, message?: string) {
    super(message || `Invalid channel identifier: ${channel}`);
    this.name = 'InvalidChannel';
    this.channel = channel;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Channel not found (HTTP 404).
 */
export class ChannelNotFound extends TeleGlanceError {
  readonly channel: string;

  constructor(channel: string) {
    super(`Channel not found: ${channel}`);
    this.name = 'ChannelNotFound';
    this.channel = channel;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Channel is private and not accessible via public preview.
 */
export class ChannelPrivate extends TeleGlanceError {
  readonly channel: string;

  constructor(channel: string) {
    super(`Channel is private: ${channel}`);
    this.name = 'ChannelPrivate';
    this.channel = channel;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Message not found (HTTP 404 on embed endpoint).
 */
export class MessageNotFound extends TeleGlanceError {
  readonly channel: string;
  readonly msgId: number;

  constructor(channel: string, msgId: number) {
    super(`Message not found: ${channel}/${msgId}`);
    this.name = 'MessageNotFound';
    this.channel = channel;
    this.msgId = msgId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Rate limited by server (HTTP 429).
 */
export class RateLimited extends TeleGlanceError {
  readonly retryAfter: number | null;

  constructor(retryAfter: number | null = null) {
    const msg = retryAfter
      ? `Rate limited. Retry after ${retryAfter}s`
      : 'Rate limited';
    super(msg);
    this.name = 'RateLimited';
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * HTTP request failed after retries.
 */
export class RequestFailed extends TeleGlanceError {
  override readonly name = 'RequestFailed';
  readonly url: string;
  readonly statusCode: number | null;
  override readonly cause: Error | null;

  constructor(
    url: string,
    statusCode: number | null = null,
    cause: Error | null = null,
  ) {
    const msg = statusCode
      ? `Request failed: ${url} (status ${statusCode})`
      : `Request failed: ${url}`;
    super(msg);
    this.url = url;
    this.statusCode = statusCode;
    this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * HTML parsing error — page structure unrecognized.
 */
export class ParseError extends TeleGlanceError {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Media download error.
 */
export class DownloadError extends TeleGlanceError {
  constructor(message: string) {
    super(message);
    this.name = 'DownloadError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Checkpoint I/O error.
 */
export class CheckpointError extends TeleGlanceError {
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'CheckpointError';
    this.cause = cause || null;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
