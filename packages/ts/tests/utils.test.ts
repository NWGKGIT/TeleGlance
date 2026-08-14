import { describe, expect, it } from 'vitest';
import { bgImageUrl, cleanText, parseCount } from '../src/utils.js';

describe('utilities', () => {
  it('parses abbreviated and formatted counts', () => {
    expect(parseCount('36.6K')).toBe(36600);
    expect(parseCount('1.2M')).toBe(1200000);
    expect(parseCount('2B')).toBe(2000000000);
    expect(parseCount('12 345')).toBe(12345);
    expect(parseCount('1,234')).toBe(1234);
    expect(parseCount('no numbers')).toBeNull();
  });

  it('extracts background image URLs and cleans whitespace', () => {
    expect(bgImageUrl("background-image:url('https://x.test/a.jpg')")).toBe('https://x.test/a.jpg');
    expect(bgImageUrl('color: red')).toBeNull();
    expect(cleanText('  a\n  b  ')).toBe('a b');
    expect(cleanText('   ')).toBeNull();
  });
});
