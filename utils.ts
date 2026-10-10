import { createHash } from 'crypto';

/**
 * Computes deterministic SHA-256 hexadecimal hash.
 */
export function computeHash(content: string): string {
  if (!content) {
    return 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  }
  return createHash('sha256').update(content.trim(), 'utf8').digest('hex');
}

/**
 * Strips script/style blocks, HTML tags, decodes common entities, and collapses spaces.
 */
export function cleanText(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitizes HTML body, preserving safe semantic tags for formatted feeds.
 */
export function cleanHtmlBody(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<(?!\/?(p|b|i|strong|em|ul|ol|li|code|pre|a\b))[^>]*>/gi, '')
    .trim();
}

/**
 * Exponential backoff with random jitter.
 */
export function calculateBackoff(failures: number, baseMs = 1000, maxMs = 60000): number {
  const exp = Math.min(failures, 6);
  const delay = Math.min(maxMs, baseMs * Math.pow(2, exp));
  const jitter = delay * (0.8 + Math.random() * 0.4);
  return Math.round(jitter);
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
