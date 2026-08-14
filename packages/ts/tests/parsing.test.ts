import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ParseError } from '../src/errors.js';
import { classifyPage, PageKind, parseChannel } from '../src/parsing/channel.js';
import { defaultRegistry, parseFeed } from '../src/parsing/message.js';

const fixture = (name: string): string =>
  readFileSync(new URL(`./fixtures/fixtures/${name}`, import.meta.url), 'utf8');

const feed = fixture('feed_page.html');

describe('page and channel parsing', () => {
  it('classifies preview, profile card, and not-found pages', () => {
    expect(classifyPage(feed)).toBe(PageKind.FEED);
    expect(classifyPage(fixture('card_page.html'))).toBe(PageKind.CARD);
    expect(classifyPage(fixture('not_found.html'))).toBe(PageKind.NOT_FOUND);
  });

  it('parses feed channel metadata and counters', () => {
    const channel = parseChannel(feed, 'testchan');
    expect(channel).toMatchObject({
      username: 'testchan',
      title: 'Test Channel',
      avatarUrl: 'https://cdn4.telesco.pe/file/avatar123.jpg',
      counts: { subscribers: 36600, photos: 1310, videos: 512, files: 83, links: 2400 },
    });
  });
});

describe('message parsing', () => {
  const messages = (): Map<number, ReturnType<typeof parseFeed>[number]> =>
    new Map(parseFeed(feed, defaultRegistry()).map((message) => [message.id, message]));

  it('skips service messages and preserves basic metadata', () => {
    const parsed = messages();
    expect([...parsed.keys()].sort((a, b) => a - b)).toEqual([101, 102, 103, 104, 105, 106, 107, 108, 110]);
    expect(parsed.get(101)).toMatchObject({
      channel: 'testchan',
      views: 1200,
      viewsStr: '1.2K',
      forwardedFrom: { name: 'Original Channel', url: 'https://t.me/original_chan' },
    });
  });

  it('extracts rich text, entities, and markdown', () => {
    const message = messages().get(101)!;
    expect(message.text).toContain('Hello bold and italic and a link plus @durov and #news');
    expect(message.entities.map((entity) => entity.type)).toEqual(
      expect.arrayContaining(['bold', 'italic', 'link', 'mention', 'hashtag', 'emoji', 'spoiler', 'code']),
    );
    expect(message.markdown).toContain('**bold**');
    expect(message.markdown).toContain('[a link](https://example.com/page)');
  });

  it('extracts every supported fixture media type', () => {
    const parsed = messages();
    expect(parsed.get(102)!.media).toEqual([
      { type: 'photo', url: 'https://cdn4.telesco.pe/file/photo_a.jpg' },
      { type: 'photo', url: 'https://cdn4.telesco.pe/file/photo_b.jpg' },
    ]);
    expect(parsed.get(103)!.media[0]).toMatchObject({ type: 'video', duration: '0:42' });
    expect(parsed.get(104)!.media[0]).toMatchObject({ type: 'voice', duration: '1:23' });
    expect(parsed.get(105)!.media[0]).toMatchObject({ type: 'document', title: 'report-final.pdf' });
    expect(parsed.get(106)!.media[0]).toMatchObject({ type: 'poll', question: 'Best async HTTP client?' });
    expect(parsed.get(107)!.media[0]).toMatchObject({ type: 'linkPreview', siteName: 'GitHub' });
    expect(parsed.get(108)!.media[0]).toMatchObject({ type: 'sticker', alt: '🎉' });
    expect(parsed.get(110)!.media[0]).toMatchObject({ type: 'location', latitude: 48.85, longitude: 2.35 });
  });

  it('parses reply, reactions, comments, and edited state', () => {
    const message = messages().get(110)!;
    expect(message.replyTo).toMatchObject({ author: 'Test Channel', msgId: 101 });

    const [metadata] = parseFeed(`
      <div class="tgme_widget_message" data-post="testchan/200">
        <span class="tgme_widget_message_edited">edited</span>
        <span class="tgme_widget_message_reaction"><i class="emoji">👍</i><span class="counter">1.2K</span></span>
        <a class="tgme_widget_message_replies">34 comments</a>
      </div>`, defaultRegistry());
    expect(metadata).toMatchObject({ edited: true, comments: 34, reactions: [{ emoji: '👍', count: 1200 }] });
  });

  it('raises in strict mode when message containers have no post id', () => {
    expect(() => parseFeed('<div class="tgme_widget_message">drifted</div>', defaultRegistry(), undefined, { strict: true }))
      .toThrow(ParseError);
  });
});
