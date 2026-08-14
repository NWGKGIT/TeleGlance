/**
 * Entity type in message text.
 */
export type EntityType =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'spoiler'
  | 'code'
  | 'pre'
  | 'link'
  | 'mention'
  | 'hashtag'
  | 'cashtag'
  | 'emoji'
  | 'customEmoji';

/**
 * Text entity with codepoint offset.
 */
export interface Entity {
  type: EntityType;
  offset: number;
  length: number;
  url?: string;
  customEmojiId?: string;
}

/**
 * Forward header indicating message was forwarded from another source.
 */
export interface ForwardHeader {
  name: string;
  url: string | null;
}

/**
 * Reply header indicating message is a reply to another message.
 */
export interface ReplyHeader {
  author: string | null;
  text: string | null;
  url: string | null;
  msgId: number | null;
}

/**
 * Reaction on a message.
 */
export interface Reaction {
  emoji: string;
  count: number | null;
  countStr: string | null;
  customEmojiId: string | null;
}

/**
 * Telegram message with text, media, and metadata.
 */
export interface Message {
  id: number;
  channel: string;
  url: string;
  date: Date | null;
  views: number | null;
  viewsStr: string | null;
  author: string | null;
  text: string;
  html: string | null;
  markdown: string | null;
  entities: Entity[];
  media: Media[];
  forwardedFrom: ForwardHeader | null;
  replyTo: ReplyHeader | null;
  edited: boolean;
  reactions: Reaction[];
  comments: number | null;
  commentsStr: string | null;
  rawHtml: string;
}

// Import Media type from media.ts (will be defined next)
import type { Media } from './media.js';
