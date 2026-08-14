/**
 * Photo attachment.
 */
export interface Photo {
  type: 'photo';
  url: string;
}

/**
 * Video attachment.
 */
export interface Video {
  type: 'video';
  url: string | null;
  thumbUrl: string | null;
  duration: string | null;
}

/**
 * Round video (video note) attachment.
 */
export interface RoundVideo {
  type: 'roundVideo';
  url: string | null;
  thumbUrl: string | null;
  duration: string | null;
}

/**
 * Voice message attachment.
 */
export interface Voice {
  type: 'voice';
  url: string;
  duration: string | null;
}

/**
 * Document reference (no download URL available on web preview).
 */
export interface DocumentRef {
  type: 'document';
  title: string;
  extra: string | null;
}

/**
 * Sticker attachment.
 */
export interface Sticker {
  type: 'sticker';
  url: string | null;
  alt: string | null;
}

/**
 * Poll option.
 */
export interface PollOption {
  text: string;
  percent: number | null;
}

/**
 * Poll attachment.
 */
export interface Poll {
  type: 'poll';
  question: string;
  kind: string | null;
  options: PollOption[];
  voters: string | null;
}

/**
 * Link preview.
 */
export interface LinkPreview {
  type: 'linkPreview';
  url: string;
  siteName: string | null;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
}

/**
 * Location attachment.
 */
export interface Location {
  type: 'location';
  url: string;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Unsupported media block.
 */
export interface Unsupported {
  type: 'unsupported';
  rawHtml: string;
}

/**
 * Discriminated union of all media types.
 */
export type Media =
  | Photo
  | Video
  | RoundVideo
  | Voice
  | DocumentRef
  | Sticker
  | Poll
  | LinkPreview
  | Location
  | Unsupported;
