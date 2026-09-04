import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('CI Infrastructure Configuration Verification (FR-001, FR-002, FR-003)', () => {
  const rootDir = process.cwd();
  const ciYmlPath = path.resolve(rootDir, '.github/workflows/ci.yml');
  const securityAuditYmlPath = path.resolve(rootDir, '.github/workflows/security-audit.yml');
  const buildElectronYmlPath = path.resolve(rootDir, '.github/workflows/build-electron.yml');

  it('verifies that all three workflow files specify node-version: 22', () => {
    const ciContent = fs.readFileSync(ciYmlPath, 'utf8');
    const securityAuditContent = fs.readFileSync(securityAuditYmlPath, 'utf8');
    const buildElectronContent = fs.readFileSync(buildElectronYmlPath, 'utf8');

    expect(ciContent).toMatch(/node-version:\s*22/);
    expect(securityAuditContent).toMatch(/node-version:\s*22/);
    expect(buildElectronContent).toMatch(/node-version:\s*22/);
  });

  it('verifies that no workflow file specifies node-version: 20', () => {
    const ciContent = fs.readFileSync(ciYmlPath, 'utf8');
    const securityAuditContent = fs.readFileSync(securityAuditYmlPath, 'utf8');
    const buildElectronContent = fs.readFileSync(buildElectronYmlPath, 'utf8');

    expect(ciContent).not.toMatch(/node-version:\s*20/);
    expect(securityAuditContent).not.toMatch(/node-version:\s*20/);
    expect(buildElectronContent).not.toMatch(/node-version:\s*20/);
  });

  it('verifies that ci.yml backend job pins pip<24.1 and does not upgrade pip unconstrained', () => {
    const ciContent = fs.readFileSync(ciYmlPath, 'utf8');

    expect(ciContent).toContain('python -m pip install "pip<24.1"');
    expect(ciContent).not.toContain('python -m pip install --upgrade pip');
  });

  it('verifies that package.json does not have an engines restriction (FR-003)', () => {
    const pkgPath = path.resolve(rootDir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

    expect(pkg.engines).toBeUndefined();
    expect(fs.existsSync(path.resolve(rootDir, '.npmrc'))).toBe(false);
  });
});
