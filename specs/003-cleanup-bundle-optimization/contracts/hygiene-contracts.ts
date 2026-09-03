/**
 * Contracts for Repository Hygiene and Package Governance
 * Feature: 003-cleanup-bundle-optimization
 */

export interface RepositoryHygieneRules {
  /**
   * Relative paths that MUST NOT exist in the repository root
   */
  prohibitedRootFiles: [
    'server.py',
    'requirements.txt',
    'tts-extension',
    'local-voice-server',
    'tts-extension.zip',
    'local-voice-server.zip',
    'bun.lock',
    'bun.lockb'
  ];

  /**
   * Relative paths that MUST exist as the single canonical backend source of truth
   */
  canonicalBackendFiles: [
    'python-backend/server.py',
    'python-backend/requirements.txt'
  ];

  /**
   * Single canonical package manager lockfile
   */
  canonicalLockfile: 'package-lock.json';
}
