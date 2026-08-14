/**
 * Extract numeric value from CSS background-image url().
 */
export function bgImageUrl(style: string | null | undefined): string | null {
  if (!style) return null;
  const match = /url\(['"]?([^'"()]+)['"]?\)/.exec(style);
  return match?.[1] ?? null;
}

/**
 * Parse count string like "36.6K" or "1.2M" to integer.
 * Handles K, M, B suffixes and space-separated thousands.
 */
export function parseCount(value: string | null | undefined): number | null {
  if (!value) return null;

  const cleaned = value.replace(/[\s,]+/g, '');
  const lower = cleaned.toLowerCase();

  // Check for suffix multipliers
  let multiplier = 1;
  let numStr = lower;

  if (lower.endsWith('k')) {
    multiplier = 1_000;
    numStr = lower.slice(0, -1);
  } else if (lower.endsWith('m')) {
    multiplier = 1_000_000;
    numStr = lower.slice(0, -1);
  } else if (lower.endsWith('b')) {
    multiplier = 1_000_000_000;
    numStr = lower.slice(0, -1);
  }

  const num = parseFloat(numStr);
  return isNaN(num) ? null : Math.round(num * multiplier);
}

/**
 * Clean text by collapsing whitespace.
 */
export function cleanText(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
}
