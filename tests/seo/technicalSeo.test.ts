import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SITE_CONFIG, getCanonicalUrl } from '../../src/utils/siteConfig';

describe('Technical SEO & Discovery Foundations (FR-001 - FR-010)', () => {
  const rootDir = process.cwd();
  const publicDir = path.resolve(rootDir, 'public');
  const indexHtmlPath = path.resolve(rootDir, 'index.html');

  it('verifies siteConfig constants and canonical URL helper (FR-001, FR-004)', () => {
    expect(SITE_CONFIG.siteName).toBe('VoxRead');
    expect(SITE_CONFIG.siteUrl).toBe('https://voxread.app');
    expect(getCanonicalUrl('/')).toBe('https://voxread.app/');
    expect(getCanonicalUrl('/library')).toBe('https://voxread.app/library');
  });

  it('verifies public/robots.txt contains required crawler directives and sitemap declaration (FR-006)', () => {
    const robotsPath = path.join(publicDir, 'robots.txt');
    expect(fs.existsSync(robotsPath)).toBe(true);

    const content = fs.readFileSync(robotsPath, 'utf8');
    expect(content).toContain('User-agent: *');
    expect(content).toContain('Allow: /');
    expect(content).toContain('Disallow: /api/');
    expect(content).toMatch(/Sitemap:\s*https:\/\/voxread\.app\/sitemap\.xml/);
  });

  it('verifies public/sitemap.xml is valid XML with canonical root URL (FR-006)', () => {
    const sitemapPath = path.join(publicDir, 'sitemap.xml');
    expect(fs.existsSync(sitemapPath)).toBe(true);

    const content = fs.readFileSync(sitemapPath, 'utf8');
    expect(content).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(content).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(content).toContain('<loc>https://voxread.app/</loc>');
    expect(content).toContain('</urlset>');
  });

  it('verifies public/llms.txt exists with structured markdown for AI agents (FR-006)', () => {
    const llmsPath = path.join(publicDir, 'llms.txt');
    expect(fs.existsSync(llmsPath)).toBe(true);

    const content = fs.readFileSync(llmsPath, 'utf8');
    expect(content).toContain('# VoxRead');
    expect(content).toContain('Text-to-Speech');
    expect(content).toContain('https://voxread.app/');
  });

  it('verifies public/manifest.webmanifest is valid JSON with PWA properties (FR-007)', () => {
    const manifestPath = path.join(publicDir, 'manifest.webmanifest');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest.name).toBe('VoxRead - AI Novel & Document Reader');
    expect(manifest.short_name).toBe('VoxRead');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#0D0D0F');
    expect(manifest.background_color).toBe('#0A0A0B');
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  });

  it('verifies index.html head contains canonical, Open Graph, Twitter cards, and Schema.org (FR-003, FR-004, FR-007, FR-010)', () => {
    const html = fs.readFileSync(indexHtmlPath, 'utf8');

    // Canonical link
    expect(html).toContain('<link rel="canonical" href="https://voxread.app/" />');

    // Open Graph
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:description"');
    expect(html).toContain('property="og:image"');
    expect(html).toContain('property="og:url"');

    // Twitter Card
    expect(html).toContain('name="twitter:card"');
    expect(html).toContain('name="twitter:image"');

    // Schema.org JSON-LD
    expect(html).toContain('<script type="application/ld+json">');
    expect(html).toContain('"@type": "WebSite"');
    expect(html).toContain('"@type": "WebApplication"');

    // Favicon & Manifest links
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"');
    expect(html).toContain('rel="icon" type="image/svg+xml" href="/favicon.svg"');
  });

  it('verifies public/404.html static fallback exists (FR-002)', () => {
    const fallbackPath = path.join(publicDir, '404.html');
    expect(fs.existsSync(fallbackPath)).toBe(true);
  });
});
