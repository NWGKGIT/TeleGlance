import { readFileSync } from 'node:fs';

export const fixture = (name: string): string =>
  readFileSync(new URL(`./fixtures/fixtures/${name}`, import.meta.url), 'utf8');

export const messageHtml = (id: number, text = 'hi', channel = 'testchan'): string => `
  <div class="tgme_widget_message" data-post="${channel}/${id}">
    <div class="tgme_widget_message_text">${text}</div>
    <time datetime="2026-07-15T10:00:00+00:00"></time>
  </div>`;

export const feedHtml = (...messages: string[]): string => `
  <section class="tgme_channel_info">
    <div class="tgme_channel_info_header_title">Test Channel</div>
    <div class="tgme_channel_info_header_username"><a>@testchan</a></div>
  </section>${messages.join('')}`;
