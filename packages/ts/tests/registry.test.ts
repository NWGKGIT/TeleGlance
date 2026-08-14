import { parse } from 'node-html-parser';
import { describe, expect, it, vi } from 'vitest';
import { defaultRegistry, parseFeed } from '../src/parsing/message.js';
import { ParserRegistry } from '../src/parsing/registry.js';
import { fixture } from './helpers.js';

describe('ParserRegistry', () => {
  it('registers custom parsers and requires explicit replacement', () => {
    const registry = new ParserRegistry();
    registry.register('custom', (node) => [{ type: 'unsupported', rawHtml: node.outerHTML }]);
    expect(registry.extract(parse('<div>x</div>').querySelector('div')!)).toHaveLength(1);
    expect(() => registry.register('custom', () => [])).toThrow(/already registered/);
    expect(() => registry.register('custom', () => [], { override: true })).not.toThrow();
  });

  it('isolates failing parsers and copies independently', () => {
    const registry = defaultRegistry();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    registry.register('broken', () => { throw new Error('markup changed'); });
    expect(parseFeed(fixture('feed_page.html'), registry).some((message) => message.media.length > 0)).toBe(true);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    const copy = registry.copy();
    copy.unregister('photo');
    expect(registry.names()).toContain('photo');
    expect(copy.names()).not.toContain('photo');
  });
});
