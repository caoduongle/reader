import { describe, it, expect } from 'vitest';
import { validateBase64Image } from '../../server/middleware/uploadGuard.js';

describe('Magic Bytes Upload Guard (FR-013, FR-016)', () => {
  describe('File Upload Magic Bytes Verification (FR-013)', () => {
    it('rejects disguised executable or script disguised as image', async () => {
      // PHP script encoded in base64
      const fakePngBase64 = Buffer.from("<?php echo 'malicious'; ?>").toString('base64');

      await expect(validateBase64Image(fakePngBase64)).rejects.toThrow(
        /Định dạng file không được phép/
      );
    });

    it('rejects arbitrary plain text disguised as image', async () => {
      const plainTextBase64 = Buffer.from('This is a plain text file pretending to be an image.').toString('base64');

      await expect(validateBase64Image(plainTextBase64)).rejects.toThrow(
        /Định dạng file không được phép/
      );
    });

    it('accepts valid PNG image with true PNG binary magic bytes header', async () => {
      // Minimal valid 1x1 transparent PNG binary bytes
      const validPngBytes = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
        0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, // IDAT chunk
        0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, // IEND chunk
        0x42, 0x60, 0x82,
      ]);

      const validPngBase64 = validPngBytes.toString('base64');
      const validated = await validateBase64Image(validPngBase64);

      expect(validated).toBeDefined();
      expect(validated.mime).toBe('image/png');
      expect(validated.buffer).toBeInstanceOf(Buffer);
    });
  });
});

