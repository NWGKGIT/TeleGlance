export { TeleGlanceClient, Client } from './client.js';
export { Transport, type TransportProtocol, type RequestHook, type ResponseHook } from './transport.js';
export type { Channel, ChannelCounts } from './models/channel.js';
export type {
  Message,
  Entity,
  EntityType,
  ForwardHeader,
  ReplyHeader,
  Reaction,
} from './models/message.js';
export type {
  Media,
  Photo,
  Video,
  RoundVideo,
  Voice,
  DocumentRef,
  Sticker,
  Poll,
  PollOption,
  LinkPreview,
  Location,
  Unsupported,
} from './models/media.js';
export {
  TeleGlanceError,
  InvalidChannel,
  ChannelNotFound,
  ChannelPrivate,
  MessageNotFound,
  ParseError,
  RequestFailed,
  RateLimited,
  DownloadError,
  CheckpointError,
} from './errors.js';
export { DEFAULT_SELECTORS, Selectors } from './parsing/selectors.js';
export { ParserRegistry, type BlockParser } from './parsing/registry.js';
export { defaultRegistry } from './parsing/message.js';
export { PageKind, classifyPage, parseChannel } from './parsing/channel.js';
export {
  type MessageCheckpoint,
  recordCheckpoint,
  type CheckpointStore,
  JsonCheckpointStore,
} from './checkpoints.js';

export const __version__ = '0.1.0';
