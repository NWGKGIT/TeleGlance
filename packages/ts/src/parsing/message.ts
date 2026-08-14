/**
 * Parsers for message nodes on t.me preview pages.
 *
 * No class names live here — all structure comes from Selectors, so
 * markup drift is fixed by adjusting a Selectors instance, not by
 * editing parser logic.
 */

import { parse, HTMLElement } from 'node-html-parser';
import { bgImageUrl, cleanText, parseCount } from '../utils.js';
import { ParseError } from '../errors.js';
import type {
  Message,
  ForwardHeader,
  ReplyHeader,
  Reaction,
} from '../models/message.js';
import type {
  Media,
  PollOption,
} from '../models/media.js';
import { extractRichText } from './entities.js';
import { ParserRegistry } from './registry.js';
import { DEFAULT_SELECTORS, type Selectors } from './selectors.js';

// ---------------------------------------------------------------------------
// helpers

function styleUrl(node: HTMLElement | null): string | null {
  return node ? bgImageUrl(node.getAttribute('style')) : null;
}

function classes(node: HTMLElement): string[] {
  const classValue = node.getAttribute('class') || '';
  return classValue.split(/\s+/).filter(Boolean);
}

function hasAncestorClass(
  node: HTMLElement,
  stop: HTMLElement,
  classSet: Set<string>,
): boolean {
  let parent = node.parentNode;
  while (parent && parent !== stop && parent instanceof HTMLElement) {
    const classValue = parent.getAttribute('class') || '';
    const parentClasses = classValue.split(/\s+/).filter(Boolean);
    if (parentClasses.some((c: string) => classSet.has(c))) {
      return true;
    }
    parent = parent.parentNode;
  }
  return false;
}

function msgIdFromUrl(url: string | null): number | null {
  if (!url) return null;
  const tail = url.replace(/\/$/, '').split('/').pop()?.split('?')[0];
  return tail && /^\d+$/.test(tail) ? parseInt(tail, 10) : null;
}

function textOf(container: HTMLElement, selector: string): string | null {
  const node = container.querySelector(selector);
  return node ? cleanText(node.textContent) : null;
}

function coordinates(url: string | null): [number | null, number | null] {
  if (!url) return [null, null];
  const parsed = new URL(url, 'https://t.me');
  const value = parsed.searchParams.get('ll') || parsed.searchParams.get('q') || '';
  if (!value || !value.includes(',')) return [null, null];
  const [lat, lon] = value.split(',', 2);
  const latNum = parseFloat(lat || '');
  const lonNum = parseFloat(lon || '');
  return [isNaN(latNum) ? null : latNum, isNaN(lonNum) ? null : lonNum];
}

// ---------------------------------------------------------------------------
// built-in block parsers — each takes the whole message node plus the active
// Selectors, and returns whatever media it recognizes

export function parsePhotos(node: HTMLElement, sel: Selectors): Media[] {
  const out: Media[] = [];
  for (const wrap of node.querySelectorAll(sel.photo)) {
    const url = styleUrl(wrap as HTMLElement);
    if (url) {
      out.push({ type: 'photo', url });
    }
  }
  return out;
}

export function parseVideos(node: HTMLElement, sel: Selectors): Media[] {
  const out: Media[] = [];
  for (const player of node.querySelectorAll(sel.videoPlayer)) {
    const video = player.querySelector(sel.video) as HTMLElement | null;
    const videoClasses = video ? (video.getAttribute('class') || '') : '';
    const durationNode = player.querySelector(sel.videoDuration);
    const duration = durationNode ? cleanText(durationNode.textContent || '') : null;
    const url = video?.getAttribute('src') || null;

    const isRound =
      videoClasses.includes(sel.roundvideoClass) ||
      player.querySelector(sel.roundvideo) !== null;

    if (isRound) {
      out.push({
        type: 'roundVideo',
        url,
        thumbUrl: styleUrl(player.querySelector(sel.roundvideoThumb) as HTMLElement),
        duration,
      });
    } else {
      out.push({
        type: 'video',
        url,
        thumbUrl: styleUrl(player.querySelector(sel.videoThumb) as HTMLElement),
        duration,
      });
    }
  }
  return out;
}

export function parseVoices(node: HTMLElement, sel: Selectors): Media[] {
  const out: Media[] = [];
  for (const audio of node.querySelectorAll(sel.voice)) {
    const src = audio.getAttribute('src');
    if (!src) continue;
    const durationNode = node.querySelector(sel.voiceDuration);
    out.push({
      type: 'voice',
      url: src,
      duration: durationNode ? cleanText(durationNode.textContent) : null,
    });
  }
  return out;
}

export function parseDocuments(node: HTMLElement, sel: Selectors): Media[] {
  const out: Media[] = [];
  for (const doc of node.querySelectorAll(sel.document)) {
    const title = textOf(doc as HTMLElement, sel.documentTitle);
    if (!title) continue;
    out.push({
      type: 'document',
      title,
      extra: textOf(doc as HTMLElement, sel.documentExtra),
    });
  }
  return out;
}

export function parseStickers(node: HTMLElement, sel: Selectors): Media[] {
  const out: Media[] = [];
  for (const sticker of node.querySelectorAll(sel.sticker)) {
    const elem = sticker as HTMLElement;
    let target: HTMLElement;

    if (classes(elem).includes(sel.stickerWrapClass)) {
      const inner = elem.querySelector(sel.stickerImage) as HTMLElement;
      target = inner || elem;
    } else if (hasAncestorClass(elem, node, new Set([sel.stickerWrapClass]))) {
      continue; // already handled through its wrap
    } else {
      target = elem;
    }

    const url =
      target.getAttribute(sel.stickerWebpAttr) ||
      styleUrl(target) ||
      (target.tagName.toLowerCase() === 'img' ? target.getAttribute('src') : null);

    out.push({
      type: 'sticker',
      url: url || null,
      alt: target.getAttribute(sel.stickerEmojiAttr) || null,
    });
  }
  return out;
}

export function parsePolls(node: HTMLElement, sel: Selectors): Media[] {
  const out: Media[] = [];
  for (const poll of node.querySelectorAll(sel.poll)) {
    const pollElem = poll as HTMLElement;
    const options: PollOption[] = [];
    for (const option of pollElem.querySelectorAll(sel.pollOption)) {
      const optionElem = option as HTMLElement;
      const percent = optionElem.querySelector(sel.pollOptionPercent);
      options.push({
        text: textOf(optionElem, sel.pollOptionText) || '',
        percent: percent ? parseCount(percent.textContent) : null,
      });
    }
    out.push({
      type: 'poll',
      question: textOf(pollElem, sel.pollQuestion) || '',
      kind: textOf(pollElem, sel.pollKind) || null,
      options,
      voters: textOf(node, sel.pollVoters),
    });
  }
  return out;
}

export function parseLinkPreviews(node: HTMLElement, sel: Selectors): Media[] {
  const out: Media[] = [];
  for (const preview of node.querySelectorAll(sel.linkPreview)) {
    const previewElem = preview as HTMLElement;
    out.push({
      type: 'linkPreview',
      url: previewElem.getAttribute('href') || '',
      siteName: textOf(previewElem, sel.linkPreviewSiteName),
      title: textOf(previewElem, sel.linkPreviewTitle),
      description: textOf(previewElem, sel.linkPreviewDescription),
      imageUrl: styleUrl(
        previewElem.querySelector(sel.linkPreviewImage) as HTMLElement,
      ),
    });
  }
  return out;
}

export function parseLocations(node: HTMLElement, sel: Selectors): Media[] {
  const out: Media[] = [];
  for (const wrap of node.querySelectorAll(sel.location)) {
    const wrapElem = wrap as HTMLElement;
    const url = wrapElem.getAttribute('href');
    const [latitude, longitude] = coordinates(url || null);
    out.push({
      type: 'location',
      url: url || '',
      imageUrl: styleUrl(wrapElem.querySelector(sel.locationImage) as HTMLElement),
      latitude,
      longitude,
    });
  }
  return out;
}

/**
 * A fresh registry with all built-in block parsers bound to the given
 * selectors (defaults to DEFAULT_SELECTORS).
 */
export function defaultRegistry(selectors: Selectors = DEFAULT_SELECTORS): ParserRegistry {
  const registry = new ParserRegistry();
  const sel = selectors;

  registry.register('photo', (node: HTMLElement) => parsePhotos(node, sel));
  registry.register('video', (node: HTMLElement) => parseVideos(node, sel));
  registry.register('voice', (node: HTMLElement) => parseVoices(node, sel));
  registry.register('document', (node: HTMLElement) => parseDocuments(node, sel));
  registry.register('sticker', (node: HTMLElement) => parseStickers(node, sel));
  registry.register('poll', (node: HTMLElement) => parsePolls(node, sel));
  registry.register('link_preview', (node: HTMLElement) =>
    parseLinkPreviews(node, sel),
  );
  registry.register('location', (node: HTMLElement) => parseLocations(node, sel));

  return registry;
}

// ---------------------------------------------------------------------------
// message + feed parsing

/**
 * Parse one message node. Returns null for nodes that carry no
 * addressable post (service messages without a post id).
 */
export function parseMessage(
  node: HTMLElement,
  registry: ParserRegistry,
  selectors: Selectors = DEFAULT_SELECTORS,
): Message | null {
  const sel = selectors;

  const dataPost = node.getAttribute(sel.postAttr);
  if (!dataPost || !dataPost.includes('/')) {
    return null;
  }
  const [channel, msgIdStr] = dataPost.split('/');
  if (!msgIdStr || !/^\d+$/.test(msgIdStr)) {
    return null;
  }
  const msgId = parseInt(msgIdStr, 10);

  let date: Date | null = null;
  const timeNode = node.querySelector(sel.dateTime);
  if (timeNode) {
    const raw = timeNode.getAttribute(sel.datetimeAttr);
    if (raw) {
      try {
        date = new Date(raw);
        if (isNaN(date.getTime())) date = null;
      } catch {
        date = null;
      }
    }
  }

  const viewsNode = node.querySelector(sel.views);
  const viewsStr = viewsNode ? cleanText(viewsNode.textContent) : null;

  let text = '';
  let html: string | null = null;
  let markdown: string | null = null;
  let entities: any[] = [];

  const textNodes = node.querySelectorAll(sel.text);
  for (const candidate of textNodes) {
    const candidateElem = candidate as HTMLElement;
    if (hasAncestorClass(candidateElem, node, sel.textExcludedAncestorClasses)) {
      continue;
    }
    const rich = extractRichText(candidateElem);
    text = rich.text;
    html = rich.html;
    markdown = rich.markdown;
    entities = rich.entities;
    break;
  }

  let forwardedFrom: ForwardHeader | null = null;
  const fwdNode = node.querySelector(sel.forwardName) as HTMLElement | null;
  if (fwdNode) {
    forwardedFrom = {
      name: cleanText(fwdNode.textContent) || '',
      url: fwdNode.getAttribute('href') || null,
    };
  }

  let replyTo: ReplyHeader | null = null;
  const replyNode = node.querySelector(sel.reply) as HTMLElement | null;
  if (replyNode) {
    const replyUrl = replyNode.getAttribute('href') || null;
    replyTo = {
      author: textOf(replyNode, sel.replyAuthor),
      text: textOf(replyNode, sel.replyText),
      url: replyUrl,
      msgId: msgIdFromUrl(replyUrl),
    };
  }

  const reactions: Reaction[] = [];
  for (const reactionNode of node.querySelectorAll(sel.reaction)) {
    const reactionElem = reactionNode as HTMLElement;
    const emojiNode = reactionElem.querySelector(sel.reactionEmoji) as HTMLElement | null;
    const emoji = emojiNode ? cleanText(emojiNode.textContent || '') : null;
    const countStr = textOf(reactionElem, sel.reactionCount);
    if (emoji) {
      reactions.push({
        emoji,
        count: parseCount(countStr),
        countStr,
        customEmojiId: emojiNode?.getAttribute('emoji-id') || null,
      });
    }
  }

  const commentsStr = textOf(node, sel.comments);

  return {
    id: msgId,
    channel: channel || '',
    url: `https://t.me/${channel}/${msgId}`,
    date,
    views: parseCount(viewsStr),
    viewsStr,
    author: textOf(node, sel.author),
    text,
    html,
    markdown,
    entities,
    media: registry.extract(node),
    forwardedFrom,
    replyTo,
    edited: node.querySelector(sel.edited) !== null,
    reactions,
    comments: parseCount(commentsStr),
    commentsStr,
    rawHtml: node.outerHTML || '',
  };
}

/**
 * Parse a t.me/s/<channel> page (or fragment) into messages,
 * in page order (oldest first).
 */
export function parseFeed(
  html: string,
  registry: ParserRegistry,
  selectors: Selectors = DEFAULT_SELECTORS,
  opts: { strict?: boolean } = {},
): Message[] {
  const sel = selectors;
  const tree = parse(html);
  const messages: Message[] = [];
  let candidates = 0;

  for (const node of tree.querySelectorAll(sel.message)) {
    const elem = node as HTMLElement;
    if (classes(elem).includes(sel.serviceMessageClass)) {
      continue;
    }
    candidates += 1;
    const message = parseMessage(elem, registry, sel);
    if (message) {
      messages.push(message);
    }
  }

  if (opts.strict && candidates > 0 && messages.length === 0) {
    throw new ParseError(
      `Found ${candidates} message container(s), but none had a valid post id`,
    );
  }

  return messages;
}
