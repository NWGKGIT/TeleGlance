/**
 * Pluggable media-block parsers.
 *
 * A block parser is a function that receives the whole message node and returns
 * the media objects it recognizes (or an empty list). The registry runs every
 * parser over every message; a parser that throws is logged and skipped rather
 * than failing the message, so markup drift in one block type never takes down
 * the rest.
 *
 * Extending without forking:
 * ```typescript
 * import { defaultRegistry } from 'teleglance';
 *
 * const registry = defaultRegistry();
 *
 * function parseGift(node: HTMLElement): Media[] {
 *   const block = node.querySelector('.tgme_widget_message_gift');
 *   return block ? [{ type: 'unsupported', rawHtml: block.outerHTML }] : [];
 * }
 *
 * registry.register('gift', parseGift);
 * const client = new TeleGlanceClient({ registry });
 * ```
 */

import type { Media } from '../models/media.js';
import type { HTMLElement } from 'node-html-parser';

export type BlockParser = (messageNode: HTMLElement) => Media[];

export class ParserRegistry {
  private parsers = new Map<string, BlockParser>();

  register(name: string, parser: BlockParser, opts?: { override?: boolean }): void {
    if (this.parsers.has(name) && !opts?.override) {
      throw new Error(
        `Parser '${name}' already registered (pass override: true to replace)`,
      );
    }
    this.parsers.set(name, parser);
  }

  unregister(name: string): void {
    this.parsers.delete(name);
  }

  names(): string[] {
    return Array.from(this.parsers.keys());
  }

  copy(): ParserRegistry {
    const clone = new ParserRegistry();
    clone.parsers = new Map(this.parsers);
    return clone;
  }

  extract(messageNode: HTMLElement): Media[] {
    const media: Media[] = [];
    for (const [name, parser] of this.parsers) {
      try {
        const result = parser(messageNode);
        if (result) {
          media.push(...result);
        }
      } catch (err) {
        console.warn(`Block parser '${name}' failed on a message:`, err);
      }
    }
    return media;
  }
}
