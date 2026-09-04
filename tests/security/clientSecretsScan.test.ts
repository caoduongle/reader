/**
 * Automated Client Secret Scan Test (FR-006, FR-007)
 * Recursively scans client source files (src/) to guarantee zero secret leakages.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function getFilesRecursively(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getFilesRecursively(fullPath, fileList);
    } else if (/\.(ts|tsx|js|jsx|json|html|css)$/.test(file)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

describe('Frontend Key Audit & Secret Leakage Prevention (OWASP A02:2021)', () => {
  const srcDir = path.resolve(process.cwd(), 'src');
  const clientFiles = getFilesRecursively(srcDir);

  it('scans src/ files: verifies zero references to service_role or admin secret keys', () => {
    const forbiddenPatterns = [
      /SUPABASE_SERVICE_ROLE/i,
      /service_role_key/i,
      /DATABASE_URL/i,
      /JWT_SECRET/i,
      /ARGON2/i,
    ];

    const violations: { file: string; match: string }[] = [];

    for (const filePath of clientFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(content)) {
          violations.push({
            file: path.relative(process.cwd(), filePath),
            match: pattern.toString(),
          });
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('ensures src/lib/supabaseClient.ts ONLY uses VITE_SUPABASE_ANON_KEY', () => {
    const clientPath = path.resolve(srcDir, 'lib/supabaseClient.ts');
    const content = fs.readFileSync(clientPath, 'utf8');

    expect(content).toContain('VITE_SUPABASE_ANON_KEY');
    expect(content).not.toContain('SERVICE_ROLE');
    expect(content).not.toContain('ADMIN_KEY');
  });
});
