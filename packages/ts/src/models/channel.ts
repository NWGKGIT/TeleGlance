/**
 * Channel subscriber and content counts.
 */
export interface ChannelCounts {
  subscribers: number | null;
  photos: number | null;
  videos: number | null;
  files: number | null;
  links: number | null;
  /** Raw display strings (e.g., {"subscribers": "36.6K"}) */
  raw: Record<string, string>;
}

/**
 * Telegram channel metadata.
 */
export interface Channel {
  username: string;
  url: string;
  title: string;
  description: string | null;
  descriptionHtml: string | null;
  avatarUrl: string | null;
  counts: ChannelCounts;
}
