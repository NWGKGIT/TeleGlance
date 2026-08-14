/**
 * Rich-text extraction: message HTML → plain text + entities + markdown.
 *
 * The walker recurses through the text node, accumulating plain text while
 * recording formatting spans as Entity objects (offsets in codepoints over
 * the plain text) and rendering a lossy markdown equivalent (GitHub-style,
 * plus ||spoiler|| and <u>underline</u>).
 */

import { type HTMLElement } from 'node-html-parser';
import type { Entity, EntityType } from '../models/message.js';

export interface RichText {
  text: string;
  html: string;
  markdown: string;
  entities: Entity[];
}

const SIMPLE_TAGS: Record<string, [EntityType, string]> = {
  b: ['bold', '**'],
  strong: ['bold', '**'],
  em: ['italic', '*'],
  u: ['underline', ''],
  ins: ['underline', ''],
  s: ['strikethrough', '~~'],
  del: ['strikethrough', '~~'],
  strike: ['strikethrough', '~~'],
  'tg-spoiler': ['spoiler', '||'],
};

/**
 * Count Unicode codepoints (not UTF-16 code units).
 * JavaScript strings are UTF-16, but Python counts codepoints.
 * Characters outside the BMP (e.g., emoji) are 2 code units but 1 codepoint.
 */
function codepointLength(text: string): number {
  return [...text].length;
}

class Walker {
  private parts: string[] = [];
  private length = 0;
  entities: Entity[] = [];

  private emit(text: string): void {
    this.parts.push(text);
    this.length += codepointLength(text);
  }

  get text(): string {
    return this.parts.join('');
  }

  walkChildren(node: HTMLElement): string {
    const markdown: string[] = [];
    for (const child of node.childNodes) {
      markdown.push(this.walk(child));
    }
    return markdown.join('');
  }

  walk(node: any): string {
    if (node.nodeType === 3) {
      const text = node.textContent || '';
      this.emit(text);
      return text;
    }

    if (node.nodeType !== 1) {
      return '';
    }

    const elem = node as HTMLElement;
    const tag = elem.tagName.toLowerCase();

    if (tag === 'br') {
      this.emit('\n');
      return '\n';
    }

    const classList = (elem.getAttribute('class') || '').split(/\s+/).filter(Boolean);

    // Standard emoji: <i class="emoji" style="..."><b>😄</b></i>
    if (tag === 'i' && classList.includes('emoji')) {
      const char = elem.textContent || '';
      const start = this.length;
      this.emit(char);
      this.entities.push({
        type: 'emoji',
        offset: start,
        length: codepointLength(char),
      });
      return char;
    }

    // Custom emoji: <tg-emoji emoji-id="...">😄</tg-emoji>
    if (tag === 'tg-emoji') {
      const char = elem.textContent || '';
      const start = this.length;
      this.emit(char);
      this.entities.push({
        type: 'customEmoji',
        offset: start,
        length: codepointLength(char),
        customEmojiId: elem.getAttribute('emoji-id') || undefined,
      });
      return char;
    }

    // Italic <i> (not emoji)
    if (tag === 'i' && !classList.includes('emoji')) {
      return this.span(elem, 'italic', '*');
    }

    // Simple formatting tags
    const simpleTag = SIMPLE_TAGS[tag];
    if (simpleTag) {
      const [etype, marker] = simpleTag;
      return this.span(elem, etype, marker);
    }

    // Spoiler: <span class="tg-spoiler">...</span>
    if (tag === 'span' && classList.includes('tg-spoiler')) {
      return this.span(elem, 'spoiler', '||');
    }

    // Code blocks
    if (tag === 'pre') {
      return this.span(elem, 'pre', '```', true);
    }

    // Inline code
    if (tag === 'code') {
      return this.span(elem, 'code', '`');
    }

    // Links
    if (tag === 'a') {
      return this.link(elem);
    }

    // Unknown/transparent wrapper (div, span, ...): recurse through it
    return this.walkChildren(elem);
  }

  private span(
    elem: HTMLElement,
    etype: EntityType,
    marker: string,
    block = false,
  ): string {
    const start = this.length;
    const innerMd = this.walkChildren(elem);
    const length = this.length - start;

    if (length === 0) {
      return '';
    }

    this.entities.push({ type: etype, offset: start, length });

    if (etype === 'underline') {
      return `<u>${innerMd}</u>`;
    }

    if (block) {
      return `\n${marker}\n${innerMd}\n${marker}\n`;
    }

    return `${marker}${innerMd}${marker}`;
  }

  private link(elem: HTMLElement): string {
    const href = elem.getAttribute('href');
    const start = this.length;
    const innerMd = this.walkChildren(elem);
    const length = this.length - start;

    if (length === 0) {
      return '';
    }

    const visible = this.text.slice(start);
    let etype: EntityType = 'link';

    if (visible.startsWith('@')) {
      etype = 'mention';
    } else if (visible.startsWith('#')) {
      etype = 'hashtag';
    } else if (visible.startsWith('$') && href?.includes('q=%24')) {
      etype = 'cashtag';
    }

    this.entities.push({
      type: etype,
      offset: start,
      length,
      url: href || undefined,
    });

    if (etype === 'mention' || etype === 'hashtag' || etype === 'cashtag' || !href) {
      return innerMd;
    }

    return `[${innerMd}](${href})`;
  }
}

function innerHtml(node: HTMLElement): string {
  return node.innerHTML;
}

/**
 * Extract plain text, entities and markdown from a message text node.
 */
export function extractRichText(node: HTMLElement): RichText {
  const walker = new Walker();
  const markdown = walker.walkChildren(node);
  return {
    text: walker.text,
    html: innerHtml(node),
    markdown,
    entities: walker.entities,
  };
}
