/**
 * Every structural assumption about t.me markup, in one place.
 *
 * When Telegram changes the preview markup, this file is where you fix it —
 * the parsers contain no hard-coded class names. Three ways to adapt:
 *
 * 1. Runtime override, no library change:
 *    ```typescript
 *    import { DEFAULT_SELECTORS, TeleGlanceClient } from 'teleglance';
 *    const selectors = DEFAULT_SELECTORS.replace({ views: '.tgme_widget_message_view_count' });
 *    const client = new TeleGlanceClient({ selectors });
 *    ```
 *
 * 2. Config-driven override (e.g., ship selector updates without a release):
 *    ```typescript
 *    const selectors = Selectors.fromDict(JSON.parse(configJson));
 *    ```
 *
 * 3. Edit the defaults below and add a fixture that captures the new markup.
 *
 * Fields are CSS selector strings unless suffixed `Attr` (an HTML attribute
 * name) or `Class` (a bare class name checked against `class` attributes).
 * Comma-separated selectors act as fallback chains — first match wins.
 */

export interface SelectorsInit {
  // -- message container --------------------------------------------------
  message?: string;
  serviceMessageClass?: string;
  postAttr?: string;
  dateTime?: string;
  datetimeAttr?: string;
  views?: string;
  author?: string;
  edited?: string;
  reaction?: string;
  reactionEmoji?: string;
  reactionCount?: string;
  comments?: string;

  // -- message text -------------------------------------------------------
  text?: string;
  textExcludedAncestorClasses?: Set<string>;

  // -- forward / reply headers -------------------------------------------
  forwardName?: string;
  reply?: string;
  replyAuthor?: string;
  replyText?: string;

  // -- media blocks -------------------------------------------------------
  photo?: string;
  videoPlayer?: string;
  video?: string;
  videoThumb?: string;
  videoDuration?: string;
  roundvideoClass?: string;
  roundvideo?: string;
  roundvideoThumb?: string;
  voice?: string;
  voiceDuration?: string;
  document?: string;
  documentTitle?: string;
  documentExtra?: string;
  sticker?: string;
  stickerWrapClass?: string;
  stickerImage?: string;
  stickerEmojiAttr?: string;
  stickerWebpAttr?: string;
  poll?: string;
  pollQuestion?: string;
  pollKind?: string;
  pollOption?: string;
  pollOptionPercent?: string;
  pollOptionText?: string;
  pollVoters?: string;
  linkPreview?: string;
  linkPreviewImage?: string;
  linkPreviewSiteName?: string;
  linkPreviewTitle?: string;
  linkPreviewDescription?: string;
  location?: string;
  locationImage?: string;

  // -- channel info (on /s/ feed pages) ----------------------------------
  channelInfo?: string;
  channelTitle?: string;
  channelUsername?: string;
  channelDescription?: string;
  channelAvatar?: string;
  channelCounter?: string;
  counterValue?: string;
  counterType?: string;

  // -- profile card (plain t.me/<name> pages) -----------------------------
  cardTitle?: string;
  cardDescription?: string;
  cardExtra?: string;
  cardAvatar?: string;
  notFound?: string;
}

export class Selectors {
  // -- message container --------------------------------------------------
  readonly message = '.tgme_widget_message';
  readonly serviceMessageClass = 'service_message';
  readonly postAttr = 'data-post';
  readonly dateTime = '.tgme_widget_message_date time, time';
  readonly datetimeAttr = 'datetime';
  readonly views = '.tgme_widget_message_views';
  readonly author = '.tgme_widget_message_from_author';
  readonly edited = '.tgme_widget_message_edited';
  readonly reaction = '.tgme_widget_message_reaction, .tgme_reaction';
  readonly reactionEmoji = '.emoji, tg-emoji';
  readonly reactionCount =
    '.tgme_widget_message_reaction_count, .tgme_reaction_count, .counter';
  readonly comments =
    '.tgme_widget_message_replies, .tgme_widget_message_comments';

  // -- message text -------------------------------------------------------
  readonly text = '.tgme_widget_message_text';
  readonly textExcludedAncestorClasses = new Set([
    'tgme_widget_message_reply',
    'tgme_widget_message_link_preview',
  ]);

  // -- forward / reply headers -------------------------------------------
  readonly forwardName = '.tgme_widget_message_forwarded_from_name';
  readonly reply = 'a.tgme_widget_message_reply';
  readonly replyAuthor = '.tgme_widget_message_author_name';
  readonly replyText =
    '.tgme_widget_message_reply_text, .tgme_widget_message_metatext, .tgme_widget_message_text';

  // -- media blocks -------------------------------------------------------
  readonly photo = 'a.tgme_widget_message_photo_wrap';
  readonly videoPlayer = '.tgme_widget_message_video_player';
  readonly video = 'video';
  readonly videoThumb = '.tgme_widget_message_video_thumb';
  readonly videoDuration = 'time';
  readonly roundvideoClass = 'roundvideo';
  readonly roundvideo = '.tgme_widget_message_roundvideo';
  readonly roundvideoThumb = '.tgme_widget_message_roundvideo_thumb';
  readonly voice = 'audio.tgme_widget_message_voice';
  readonly voiceDuration = 'time.tgme_widget_message_voice_duration';
  readonly document = '.tgme_widget_message_document';
  readonly documentTitle = '.tgme_widget_message_document_title';
  readonly documentExtra = '.tgme_widget_message_document_extra';
  readonly sticker =
    '.tgme_widget_message_sticker_wrap, .tgme_widget_message_sticker';
  readonly stickerWrapClass = 'tgme_widget_message_sticker_wrap';
  readonly stickerImage = '.tgme_widget_message_sticker';
  readonly stickerEmojiAttr = 'data-sticker-emoji';
  readonly stickerWebpAttr = 'data-webp';
  readonly poll = '.tgme_widget_message_poll';
  readonly pollQuestion = '.tgme_widget_message_poll_question';
  readonly pollKind = '.tgme_widget_message_poll_type';
  readonly pollOption = '.tgme_widget_message_poll_option';
  readonly pollOptionPercent = '.tgme_widget_message_poll_option_percent';
  readonly pollOptionText = '.tgme_widget_message_poll_option_text';
  readonly pollVoters = '.tgme_widget_message_voters';
  readonly linkPreview = 'a.tgme_widget_message_link_preview';
  readonly linkPreviewImage = '.link_preview_image, .link_preview_right_image';
  readonly linkPreviewSiteName = '.link_preview_site_name';
  readonly linkPreviewTitle = '.link_preview_title';
  readonly linkPreviewDescription = '.link_preview_description';
  readonly location = 'a.tgme_widget_message_location_wrap';
  readonly locationImage = '.tgme_widget_message_location';

  // -- channel info (on /s/ feed pages) ----------------------------------
  readonly channelInfo = '.tgme_channel_info';
  readonly channelTitle = '.tgme_channel_info_header_title';
  readonly channelUsername = '.tgme_channel_info_header_username a';
  readonly channelDescription = '.tgme_channel_info_description';
  readonly channelAvatar =
    '.tgme_page_photo_image img, img.tgme_page_photo_image, img';
  readonly channelCounter = '.tgme_channel_info_counter';
  readonly counterValue = '.counter_value';
  readonly counterType = '.counter_type';

  // -- profile card (plain t.me/<name> pages) -----------------------------
  readonly cardTitle = '.tgme_page_title';
  readonly cardDescription = '.tgme_page_description';
  readonly cardExtra = '.tgme_page_extra';
  readonly cardAvatar = '.tgme_page_photo_image img, img.tgme_page_photo_image';
  readonly notFound = '.tgme_landing .tl_page';

  constructor(init?: SelectorsInit) {
    if (init) {
      Object.assign(this, init);
    }
  }

  /**
   * Create a copy with the given fields changed.
   */
  replace(overrides: SelectorsInit): Selectors {
    return new Selectors({ ...this, ...overrides });
  }

  /**
   * Create from defaults plus overrides from a plain object (e.g., loaded from JSON).
   * Unknown keys raise, so typos in a config file fail loudly.
   */
  static fromDict(data: Record<string, unknown>): Selectors {
    const known = new Set(Object.keys(new Selectors()));
    const unknown = Object.keys(data).filter((k) => !known.has(k));
    if (unknown.length > 0) {
      throw new TypeError(`Unknown selector fields: ${unknown.sort().join(', ')}`);
    }

    const coerced: SelectorsInit = { ...data };
    if ('textExcludedAncestorClasses' in coerced) {
      coerced.textExcludedAncestorClasses = new Set(
        data.textExcludedAncestorClasses as string[],
      );
    }

    return new Selectors(coerced);
  }
}

export const DEFAULT_SELECTORS = new Selectors();
