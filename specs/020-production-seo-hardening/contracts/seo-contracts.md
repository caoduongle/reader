# Contracts: Technical SEO, Discovery & Markup Specifications

**Feature**: `020-production-seo-hardening`  

---

## 1. `public/robots.txt` Contract

```text
# Robots.txt for VoxRead (https://voxread.app)
User-agent: *
Allow: /
Disallow: /api/
Disallow: /dist-electron/

# Sitemap location
Sitemap: https://voxread.app/sitemap.xml
```

---

## 2. `public/sitemap.xml` Contract

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://voxread.app/</loc>
    <lastmod>2026-09-04</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://voxread.app/library</loc>
    <lastmod>2026-09-04</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

---

## 3. `public/llms.txt` Contract

```markdown
# VoxRead
> Modern AI Text-to-Speech (TTS) Novel & Document Reader with RVC Voice Cloning and Synchronized Karaoke Highlighting.

## Overview
VoxRead is an accessible, desktop-friendly and web-based reader application designed for long-form reading, fiction, and document listening.

## Key Capabilities
- **Local AI TTS & RVC**: Integrates Microsoft Edge-TTS with Retrieval-based Voice Conversion (RVC) for realistic speech synthesis.
- **Karaoke Highlighting**: Synchronized, sentence-by-sentence reading highlight with smooth autoscroll.
- **Multi-Format Support**: Native client-side parsing for EPUB, PDF, and TXT files.
- **Offline Storage**: IndexedDB persistence for books, chapters, reading bookmarks, and statistics.
- **Vision OCR**: Google Gemini AI vision integration for extracting readable text from screenshots and scanned images.
- **Accessible & Ambient**: Comprehensive themes (Dark, Midnight, Sepia, Paper, Forest), dyslexic-friendly typography, and keyboard navigation.

## Technical Architecture
- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite
- **Backend / Proxy**: Node.js Express 4 with Helmet, Argon2, and strict CSP
- **TTS Engine**: Python 3.10 with Edge-TTS and RVC inference

## Public URLs & Resources
- **Homepage**: https://voxread.app/
- **Documentation & Sitemaps**: https://voxread.app/sitemap.xml
- **Repository**: https://github.com/caoduongle/reader
```

---

## 4. `public/manifest.webmanifest` Contract

```json
{
  "name": "VoxRead - AI Novel & Document Reader",
  "short_name": "VoxRead",
  "description": "Modern desktop and web AI TTS novel reader with synchronized highlight and multi-format support.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0A0A0B",
  "theme_color": "#0D0D0F",
  "icons": [
    {
      "src": "/favicon.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    },
    {
      "src": "/favicon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/favicon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## 5. Breadcrumb Component Schema Contract

```html
<nav aria-label="Breadcrumb" class="flex items-center text-xs text-slate-400 space-x-1.5 py-1">
  <ol class="flex items-center space-x-1.5 list-none m-0 p-0">
    <li class="flex items-center">
      <a href="/" class="hover:text-amber-400 transition-colors">Trang chủ</a>
      <span class="mx-1.5 text-slate-600">/</span>
    </li>
    <li class="flex items-center">
      <span class="text-slate-300 font-medium truncate max-w-[140px] md:max-w-xs">{documentTitle}</span>
      <span class="mx-1.5 text-slate-600">/</span>
    </li>
    <li class="flex items-center text-amber-500 font-semibold" aria-current="page">
      <span>{chapterTitle}</span>
    </li>
  </ol>
</nav>
```
