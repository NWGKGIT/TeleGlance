import { describe, expect, it } from 'vitest';
import { DEFAULT_SELECTORS, Selectors } from '../src/parsing/selectors.js';
import { defaultRegistry, parseFeed } from '../src/parsing/message.js';

const driftedFeed = `
  <section class="tgme_channel_info"><div class="tgme_channel_info_header_title">Test Channel</div></section>
  <div class="tgme_widget_message" data-post="testchan/201">
    <a class="tgme_widget_message_photo_box" style="background-image:url('https://cdn4.telesco.pe/file/new.jpg')"></a>
    <div class="tgme_widget_message_body">drifted markup text</div>
  </div>`;

describe('selector overrides', () => {
  it('requires only selector changes to adapt to markup drift', () => {
    expect(parseFeed(driftedFeed, defaultRegistry())[0]!).toMatchObject({ text: '', media: [] });
    const selectors = DEFAULT_SELECTORS.replace({
      text: '.tgme_widget_message_body', photo: 'a.tgme_widget_message_photo_box',
    });
    expect(parseFeed(driftedFeed, defaultRegistry(selectors), selectors)[0]!).toMatchObject({
      text: 'drifted markup text', media: [{ type: 'photo', url: 'https://cdn4.telesco.pe/file/new.jpg' }],
    });
  });

  it('builds safe default-based configurations', () => {
    const selectors = Selectors.fromDict({ text: '.tgme_widget_message_body' });
    expect(selectors.text).toBe('.tgme_widget_message_body');
    expect(selectors.photo).toBe(DEFAULT_SELECTORS.photo);
    expect(() => Selectors.fromDict({ tpyo: '.x' })).toThrow(/tpyo/);
  });
});
