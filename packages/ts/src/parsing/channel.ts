/**
 * Parsers for channel-level information and page-status detection.
 *
 * Like the message parsers, all structure comes from Selectors —
 * nothing here hard-codes t.me class names.
 */

import { parse } from 'node-html-parser';
import type { HTMLElement } from 'node-html-parser';
import { cleanText, parseCount } from '../utils.js';
import type { Channel, ChannelCounts } from '../models/channel.js';
import { DEFAULT_SELECTORS, type Selectors } from './selectors.js';

/**
 * What a fetched t.me page turned out to be.
 */
export enum PageKind {
  FEED = 'feed', // /s/ preview with channel info (may have zero messages)
  CARD = 'card', // plain t.me/<name> profile card (no public preview from /s/)
  NOT_FOUND = 'not_found',
  UNKNOWN = 'unknown', // neither — likely markup drift or an interception page
}

/**
 * Classify a t.me page by its structure.
 */
export function classifyPage(
  html: string,
  selectors: Selectors = DEFAULT_SELECTORS,
): PageKind {
  const tree = parse(html);

  if (tree.querySelector(selectors.channelInfo)) {
    return PageKind.FEED;
  }
  if (tree.querySelector(selectors.cardTitle)) {
    return PageKind.CARD;
  }
  if (tree.querySelector(selectors.notFound)) {
    return PageKind.NOT_FOUND;
  }
  return PageKind.UNKNOWN;
}

function textOf(container: HTMLElement, selector: string): string | null {
  const node = container.querySelector(selector);
  return node ? cleanText(node.textContent) : null;
}

function htmlOf(container: HTMLElement, selector: string): string | null {
  const node = container.querySelector(selector);
  return node ? node.innerHTML : null;
}

/**
 * Parse channel info from either a /s/ feed page (rich: counters) or a
 * profile card page (title/description only). Returns null if the page has
 * no channel data at all.
 */
export function parseChannel(
  html: string,
  username: string,
  selectors: Selectors = DEFAULT_SELECTORS,
): Channel | null {
  const tree = parse(html);

  // Try feed page first (rich data with counters)
  const info = tree.querySelector(selectors.channelInfo);
  if (info) {
    const usernameNode = info.querySelector(selectors.channelUsername);
    const handle = usernameNode
      ? (cleanText(usernameNode.textContent) || '').replace(/^@/, '') || username
      : username;

    const rawCounts: Record<string, string> = {};
    const counterNodes = info.querySelectorAll(selectors.channelCounter);
    for (const counter of counterNodes) {
      const value = textOf(counter, selectors.counterValue);
      const kind = textOf(counter, selectors.counterType);
      if (value && kind) {
        rawCounts[kind] = value;
      }
    }

    const countOf = (...labels: string[]): number | null => {
      for (const label of labels) {
        if (label in rawCounts) {
          return parseCount(rawCounts[label]);
        }
      }
      return null;
    };

    const avatar = info.querySelector(selectors.channelAvatar);
    const counts: ChannelCounts = {
      subscribers: countOf('subscribers', 'subscriber'),
      photos: countOf('photos', 'photo'),
      videos: countOf('videos', 'video'),
      files: countOf('files', 'file'),
      links: countOf('links', 'link'),
      raw: rawCounts,
    };

    return {
      username: handle,
      url: `https://t.me/${handle}`,
      title: textOf(info, selectors.channelTitle) || handle,
      description: textOf(info, selectors.channelDescription),
      descriptionHtml: htmlOf(info, selectors.channelDescription),
      avatarUrl: avatar?.getAttribute('src') || null,
      counts,
    };
  }

  // Try profile card (private channel fallback)
  const title = textOf(tree, selectors.cardTitle);
  if (title) {
    const avatar = tree.querySelector(selectors.cardAvatar);
    const rawCounts: Record<string, string> = {};
    let subscribers: number | null = null;

    const extraText = textOf(tree, selectors.cardExtra);
    if (extraText && extraText.includes('subscriber')) {
      rawCounts.subscribers = extraText;
      subscribers = parseCount(extraText);
    }

    return {
      username,
      url: `https://t.me/${username}`,
      title,
      description: textOf(tree, selectors.cardDescription),
      descriptionHtml: htmlOf(tree, selectors.cardDescription),
      avatarUrl: avatar?.getAttribute('src') || null,
      counts: {
        subscribers,
        photos: null,
        videos: null,
        files: null,
        links: null,
        raw: rawCounts,
      },
    };
  }

  return null;
}
