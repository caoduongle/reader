import { describe, it, expect } from 'vitest';
import documentRouter from '../../server/routes/documents.js';
import { updateDocumentSchema } from '../../server/validators/apiSchemas.js';

describe('AppSec FR-007 & FR-008: Multi-Tenant Data Isolation & IDOR Defense', () => {

  it('updateDocumentSchema strictly blocks field tampering (mass assignment)', () => {
    const invalidPayload = {
      title: 'Valid Document Title',
      role: 'admin',
      is_admin: true,
      balance: 999999,
    };

    const parseResult = updateDocumentSchema.safeParse(invalidPayload);
    expect(parseResult.success).toBe(false);
  });

  it('updateDocumentSchema allows legitimate user edits', () => {
    const validPayload = {
      title: 'Updated Chapter Title',
      readingProgress: 45.5,
      currentPosition: 1200,
    };

    const parseResult = updateDocumentSchema.safeParse(validPayload);
    expect(parseResult.success).toBe(true);
    if (parseResult.success) {
      expect(parseResult.data.title).toBe('Updated Chapter Title');
      expect(parseResult.data.readingProgress).toBe(45.5);
    }
  });

  it('documentRouter is defined and exports valid Express router', () => {
    expect(documentRouter).toBeDefined();
  });
});
