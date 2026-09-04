/**
 * Centralized Site Configuration & Technical SEO Metadata
 */

export const SITE_CONFIG = {
  siteName: 'VoxRead',
  siteUrl: (import.meta.env?.VITE_SITE_URL as string) || 'https://voxread.app',
  defaultTitle: 'VoxRead - Đọc Truyện & Tài Liệu Thông Minh Bằng Giọng Nói AI',
  defaultDescription:
    'Ứng dụng đọc truyện và tài liệu văn bản bằng giọng nói AI thông minh (TTS), hỗ trợ karaoke highlight câu đọc, RVC voice clone và đa định dạng EPUB, PDF, TXT.',
  defaultOgImage: 'https://voxread.app/og-preview.png',
  themeColor: '#0D0D0F',
  backgroundColor: '#0A0A0B',
  locale: 'vi_VN',
  author: 'VoxRead Team',
} as const;

export function getCanonicalUrl(pathname: string = '/'): string {
  const base = SITE_CONFIG.siteUrl.replace(/\/+$/, '');
  const cleanPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${base}${cleanPath === '/' ? '/' : cleanPath}`;
}
