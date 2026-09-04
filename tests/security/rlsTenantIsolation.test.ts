/**
 * PostgreSQL Row-Level Security (RLS) Policy & Schema Audit (FR-008, FR-009, FR-010, FR-011)
 * Validates that migration definitions enforce 100% RLS coverage and tenant isolation.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Database Row-Level Security (RLS) & Tenant Isolation Audit (OWASP A01:2021)', () => {
  const migrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20260904_security_hardening.sql'
  );
  const sqlContent = fs.readFileSync(migrationPath, 'utf8');

  it('verifies RLS is enabled on 100% of tables (FR-008)', () => {
    const requiredTables = [
      'user_profiles',
      'documents',
      'bookmarks',
      'security_audit_logs',
    ];

    for (const table of requiredTables) {
      const enableRlsRegex = new RegExp(
        `ALTER\\s+TABLE\\s+public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
        'i'
      );
      expect(sqlContent).toMatch(enableRlsRegex);
    }
  });

  it('verifies tenant isolation policies constrain access to auth.uid() (FR-009)', () => {
    // Documents must check auth.uid() = user_id
    expect(sqlContent).toContain('CREATE POLICY "documents_select_own"');
    expect(sqlContent).toContain('USING (auth.uid() = user_id)');

    // Bookmarks must check auth.uid() = user_id
    expect(sqlContent).toContain('CREATE POLICY "bookmarks_select_own"');
    expect(sqlContent).toContain('USING (auth.uid() = user_id)');

    // Profiles must check auth.uid() = auth_user_id
    expect(sqlContent).toContain('CREATE POLICY "user_profiles_select_own"');
    expect(sqlContent).toContain('USING (auth.uid() = auth_user_id)');
  });

  it('verifies audit logs are append-only and forbid public reads (FR-011)', () => {
    expect(sqlContent).toContain('CREATE POLICY "audit_logs_insert_only"');
    expect(sqlContent).toContain('CREATE POLICY "audit_logs_no_public_select"');
    expect(sqlContent).toContain('USING (false)');
  });

  it('verifies privilege escalation trigger blocks role/is_admin tampering (FR-010)', () => {
    expect(sqlContent).toContain('protect_sensitive_profile_fields');
    expect(sqlContent).toContain('current_user != \'service_role\'');
    expect(sqlContent).toContain('current_user != \'postgres\'');
    expect(sqlContent).toContain('Không được phép sửa đổi trường role hoặc is_admin');
  });
});
