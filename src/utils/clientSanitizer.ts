import DOMPurify from 'dompurify';

export interface ClientSanitizeOptions {
  allowedTags?: string[];
  forbidTags?: string[];
}

const DEFAULT_ALLOWED_TAGS = [
  'p',
  'br',
  'b',
  'i',
  'strong',
  'em',
  'u',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'ul',
  'ol',
  'li',
  'span',
  'table',
  'tbody',
  'tr',
  'td',
  'th',
  'hr',
  'a',
];

const DEFAULT_FORBIDDEN_TAGS = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'];

/**
 * Sanitizes dirty HTML strings using DOMPurify before DOM insertion (FR-008).
 * Guarantees that script tags, iframes, and malicious event handlers (onload, onerror)
 * are completely stripped while preserving safe novel reading typography.
 */
export function sanitizeForRender(dirtyHtml: string, options: ClientSanitizeOptions = {}): string {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(dirtyHtml, {
    ALLOWED_TAGS: options.allowedTags || DEFAULT_ALLOWED_TAGS,
    FORBID_TAGS: options.forbidTags || DEFAULT_FORBIDDEN_TAGS,
  });
}

export default sanitizeForRender;
