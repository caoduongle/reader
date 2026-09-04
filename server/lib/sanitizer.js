/**
 * Content Sanitization & XSS Defense (FR-015)
 * Strips executable scripts, event handlers, and dangerous iframe/object tags
 * from user inputs and web article extractions.
 */

import sanitizeHtml from 'sanitize-html';

const SANITIZE_OPTIONS = {
  allowedTags: [
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
  ],
  allowedAttributes: {
    span: ['class'],
    p: ['class'],
    th: ['colspan', 'rowspan'],
    td: ['colspan', 'rowspan'],
  },
  allowedSchemes: ['http', 'https'],
  disallowedTagsMode: 'discard',
  enforceHtmlBoundary: true,
};

/**
 * Sanitizes HTML content or article body, stripping any XSS vectors.
 * @param {string} rawContent
 * @returns {string} Clean HTML string
 */
export function sanitizeContent(rawContent) {
  if (!rawContent || typeof rawContent !== 'string') {
    return '';
  }

  return sanitizeHtml(rawContent, SANITIZE_OPTIONS).trim();
}

/**
 * Escapes characters with special HTML entity meaning.
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
