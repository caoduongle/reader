import { describe, it, expect } from 'vitest';
import { generateSchema, fetchUrlSchema } from '../../server/validators/apiSchemas.js';
import { sanitizeContent, escapeHtml } from '../../server/lib/sanitizer.js';
import { validateBufferMagicBytes } from '../../server/middleware/uploadGuard.js';

describe('AppSec FR-014: Input Validation (Zod Schemas)', () => {
  it('rejects empty or whitespace-only prompt in generateSchema', () => {
    const res = generateSchema.safeParse({ prompt: '   ' });
    expect(res.success).toBe(false);
  });

  it('rejects invalid URL in fetchUrlSchema', () => {
    const res = fetchUrlSchema.safeParse({ url: 'javascript:alert(1)' });
    expect(res.success).toBe(false);
  });
});

describe('AppSec FR-015: Content Sanitization & XSS Defense', () => {
  it('strips script tags and onload event handlers', () => {
    const dirty = '<p>Normal text</p><script>alert("XSS")</script><img src="x" onerror="alert(1)"/>';
    const clean = sanitizeContent(dirty);
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('alert');
    expect(clean).toContain('<p>Normal text</p>');
  });

  it('escapes HTML special characters', () => {
    const escaped = escapeHtml('<script>"test" & \'value\'</script>');
    expect(escaped).toBe('&lt;script&gt;&quot;test&quot; &amp; &#039;value&#039;&lt;/script&gt;');
  });
});

describe('AppSec FR-016: Magic Bytes File Verification', () => {
  it('rejects empty buffer', async () => {
    await expect(validateBufferMagicBytes(Buffer.from([]))).rejects.toThrow('Dữ liệu file rỗng.');
  });

  it('rejects non-whitelisted files (e.g. text/plain pretending to be image)', async () => {
    const fakeImage = Buffer.from('This is pure ASCII text, not a PNG');
    await expect(validateBufferMagicBytes(fakeImage)).rejects.toThrow(/Định dạng file không được phép/);
  });

  it('accepts valid PNG magic bytes buffer', async () => {
    // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A + dummy chunk
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
    ]);
    const result = await validateBufferMagicBytes(pngHeader);
    expect(result.mime).toBe('image/png');
    expect(result.ext).toBe('png');
    expect(result.safeFilename).toMatch(/\.png$/);
  });
});
