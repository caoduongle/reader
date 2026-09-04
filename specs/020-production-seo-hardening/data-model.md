# Data Model: Technical SEO & Metadata Entities

**Feature**: `020-production-seo-hardening`  
**Date**: 2026-09-04  

---

## 1. Entities

### Entity 1: `SiteConfig`
Defines authoritative global domain and branding metadata.

| Field | Type | Default Value | Description |
|:---|:---|:---|:---|
| `siteName` | `string` | `"VoxRead"` | Brand and application title |
| `siteUrl` | `string` | `"https://voxread.app"` | Authoritative production origin |
| `defaultTitle` | `string` | `"VoxRead - Đọc Truyện & Tài Liệu Thông Minh Bằng Giọng Nói AI"` | Default page `<title>` |
| `defaultDescription` | `string` | `"Ứng dụng đọc truyện và tài liệu văn bản bằng giọng nói AI thông minh (TTS), hỗ trợ karaoke highlight câu đọc, RVC voice clone và đa định dạng EPUB, PDF, TXT."` | Meta description (150-160 chars) |
| `defaultOgImage` | `string` | `"https://voxread.app/og-preview.png"` | 1200x630 social share banner |
| `themeColor` | `string` | `"#0D0D0F"` | Browser toolbar & ambient color |
| `locale` | `string` | `"vi_VN"` | Primary language locale |

---

### Entity 2: `SEOState`
Represents dynamic, per-view or per-document metadata managed by `useDocumentSEO`.

| Field | Type | Mandatory | Description |
|:---|:---|:---|:---|
| `title` | `string` | Yes | Target `<title>` and `og:title` |
| `description` | `string` | Yes | Target `<meta name="description">` and `og:description` |
| `canonicalPath` | `string` | No | Path appended to `siteUrl` for `<link rel="canonical">` |
| `ogImage` | `string` | No | Social image URL (defaults to `defaultOgImage`) |
| `ogType` | `string` | No | `"website"` or `"article"` |
| `noindex` | `boolean`| No | Set to `true` on 404 views to output `<meta name="robots" content="noindex, nofollow" />` |

---

### Entity 3: `BreadcrumbNode`
Represents an individual node in the breadcrumb hierarchy.

| Field | Type | Mandatory | Example |
|:---|:---|:---|:---|
| `label` | `string` | Yes | `"Trang chủ"`, `"Sherlock Holmes"`, `"Chương 1"` |
| `href` | `string` | No | `"/"` or `undefined` for active node |
| `onClick` | `function` | No | Optional callback to trigger drawer/action |
| `isCurrent` | `boolean` | Yes | Flags the terminal active item |

---

### Entity 4: `SchemaOrgGraph`
Defines JSON-LD structured data adhering to schema.org standards.

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://voxread.app/#website",
      "url": "https://voxread.app/",
      "name": "VoxRead",
      "description": "Modern AI Text-to-Speech Novel & Document Reader",
      "inLanguage": "vi-VN"
    },
    {
      "@type": "WebApplication",
      "@id": "https://voxread.app/#app",
      "name": "VoxRead",
      "url": "https://voxread.app/",
      "applicationCategory": "MultimediaApplication",
      "operatingSystem": "Web, Windows, macOS, Linux",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "featureList": [
        "AI Text-to-Speech (Edge-TTS)",
        "RVC Voice Conversion",
        "Synchronized Karaoke Sentence Highlighting",
        "Multi-format Reader (EPUB, PDF, TXT)",
        "Offline IndexedDB Document Storage",
        "Gemini AI OCR Screen Reader"
      ]
    }
  ]
}
```
