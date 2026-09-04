import { useEffect } from 'react';
import { SITE_CONFIG, getCanonicalUrl } from '../utils/siteConfig';

export interface DocumentSEOProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  noindex?: boolean;
}

/**
 * Hook to dynamically update document title, meta description, canonical link,
 * and Open Graph attributes for On-Page SEO.
 */
export function useDocumentSEO({
  title,
  description,
  canonicalPath = '/',
  ogImage,
  ogType = 'website',
  noindex = false,
}: DocumentSEOProps = {}) {
  useEffect(() => {
    // 1. Update document title
    const finalTitle = title
      ? title.includes(SITE_CONFIG.siteName)
        ? title
        : `${title} | ${SITE_CONFIG.siteName}`
      : SITE_CONFIG.defaultTitle;
    document.title = finalTitle;

    // 2. Helper to set or create meta tags
    const setMetaTag = (attribute: string, attrValue: string, content: string) => {
      let element = document.querySelector(`meta[${attribute}="${attrValue}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, attrValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // 3. Helper to set or create link tags
    const setLinkTag = (rel: string, href: string) => {
      let element = document.querySelector(`link[rel="${rel}"]`);
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        document.head.appendChild(element);
      }
      element.setAttribute('href', href);
    };

    const finalDescription = description || SITE_CONFIG.defaultDescription;
    const finalCanonical = getCanonicalUrl(canonicalPath);
    const finalImage = ogImage || SITE_CONFIG.defaultOgImage;

    // Description & Canonical
    setMetaTag('name', 'description', finalDescription);
    setLinkTag('canonical', finalCanonical);

    // Robots directive
    setMetaTag('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

    // Open Graph
    setMetaTag('property', 'og:title', finalTitle);
    setMetaTag('property', 'og:description', finalDescription);
    setMetaTag('property', 'og:url', finalCanonical);
    setMetaTag('property', 'og:image', finalImage);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:site_name', SITE_CONFIG.siteName);
    setMetaTag('property', 'og:locale', SITE_CONFIG.locale);

    // Twitter Card
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', finalTitle);
    setMetaTag('name', 'twitter:description', finalDescription);
    setMetaTag('name', 'twitter:image', finalImage);
  }, [title, description, canonicalPath, ogImage, ogType, noindex]);
}
