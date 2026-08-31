import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import { parseNovelText } from './textParser';
import { Chapter } from '../types';

// Configure pdfjs worker if available or set fallback
try {
  // Use CDN worker or inline
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
} catch {
  // Continue even if worker config fails
}

/**
 * Extracts plain text from a TXT or Markdown file.
 */
export async function parseTxtFile(file: File): Promise<{ title: string; chapters: Chapter[]; rawText: string }> {
  const text = await file.text();
  const title = file.name.replace(/\.[^/.]+$/, '');
  const chapters = parseNovelText(text, title);
  return { title, chapters, rawText: text };
}

/**
 * Extracts text from a PDF file using pdfjs-dist.
 */
export async function parsePdfFile(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ title: string; chapters: Chapter[]; rawText: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdfDoc = await loadingTask.promise;

  const numPages = pdfDoc.numPages;
  const pageTexts: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    
    // Group text items by roughly their Y coordinate or line flow
    let lastY: number | null = null;
    let pageString = '';

    for (const item of textContent.items) {
      if ('str' in item) {
        const itemStr = item.str;
        const currentY = 'transform' in item ? item.transform[5] : null;

        if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 8) {
          pageString += '\n' + itemStr;
        } else {
          pageString += (pageString.endsWith(' ') || itemStr.startsWith(' ') ? '' : ' ') + itemStr;
        }
        lastY = currentY;
      }
    }

    pageTexts.push(pageString.trim());
    if (onProgress) {
      onProgress(Math.round((i / numPages) * 100));
    }
  }

  const fullText = pageTexts.join('\n\n');
  const title = file.name.replace(/\.[^/.]+$/, '');
  const chapters = parseNovelText(fullText, title);

  return { title, chapters, rawText: fullText };
}

/**
 * Extracts chapters & text from an EPUB file using JSZip.
 */
export async function parseEpubFile(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ title: string; author?: string; chapters: Chapter[]; rawText: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // 1. Find container.xml to locate the OPF file
  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) {
    throw new Error('Invalid EPUB file: META-INF/container.xml not found.');
  }

  const containerXml = await containerFile.async('text');
  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(containerXml, 'application/xml');
  const rootfilePath = containerDoc.querySelector('rootfile')?.getAttribute('full-path');

  if (!rootfilePath) {
    throw new Error('Invalid EPUB file: rootfile path not specified in container.');
  }

  const opfFile = zip.file(rootfilePath);
  if (!opfFile) {
    throw new Error(`OPF file not found at ${rootfilePath}`);
  }

  const opfDir = rootfilePath.includes('/') ? rootfilePath.substring(0, rootfilePath.lastIndexOf('/') + 1) : '';
  const opfXml = await opfFile.async('text');
  const opfDoc = parser.parseFromString(opfXml, 'application/xml');

  // Metadata
  const docTitle = opfDoc.querySelector('title')?.textContent || file.name.replace(/\.[^/.]+$/, '');
  const docAuthor = opfDoc.querySelector('creator')?.textContent || undefined;

  // Manifest items
  const manifestItems: Record<string, string> = {};
  opfDoc.querySelectorAll('manifest > item').forEach(item => {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    if (id && href) {
      manifestItems[id] = href;
    }
  });

  // Spine itemref items in order
  const spineItemRefs = Array.from(opfDoc.querySelectorAll('spine > itemref'))
    .map(ref => ref.getAttribute('idref'))
    .filter(Boolean) as string[];

  const extractedChapters: { title: string; content: string }[] = [];
  const fullTextParts: string[] = [];

  for (let i = 0; i < spineItemRefs.length; i++) {
    const idref = spineItemRefs[i];
    const relHref = manifestItems[idref];
    if (!relHref) continue;

    // Decode URL component in href if encoded
    const decodedHref = decodeURIComponent(relHref.split('#')[0]);
    const fullPath = opfDir + decodedHref;

    const entry = zip.file(fullPath) || zip.file(decodedHref);
    if (entry) {
      const htmlContent = await entry.async('text');
      const doc = parser.parseFromString(htmlContent, 'text/html');

      // Remove script and style tags
      doc.querySelectorAll('script, style, head').forEach(el => el.remove());

      // Extract chapter title from h1, h2 or title tag
      const heading = doc.querySelector('h1, h2, h3, title')?.textContent?.trim() || `Chapter ${i + 1}`;

      // Convert paragraphs/divs to text with clean spacing
      const elements = doc.body ? Array.from(doc.body.querySelectorAll('p, h1, h2, h3, h4, blockquote, li, div')) : [];
      let chapterText = '';

      if (elements.length > 0) {
        chapterText = elements
          .map(el => el.textContent?.trim())
          .filter(Boolean)
          .join('\n\n');
      } else {
        chapterText = doc.body?.textContent?.trim() || '';
      }

      if (chapterText.trim().length > 30) {
        extractedChapters.push({
          title: heading,
          content: chapterText.trim()
        });
        fullTextParts.push(chapterText.trim());
      }
    }

    if (onProgress) {
      onProgress(Math.round(((i + 1) / spineItemRefs.length) * 100));
    }
  }

  // If no chapters were extracted through spine, fallback to raw text
  let finalChapters: Chapter[] = [];
  const combinedRaw = fullTextParts.join('\n\n\n');

  if (extractedChapters.length > 0) {
    finalChapters = extractedChapters.map((chap, idx) => {
      const parsed = parseNovelText(chap.content, chap.title);
      return {
        id: `chap-${idx + 1}`,
        title: chap.title,
        paragraphs: parsed[0]?.paragraphs || [],
        totalSentences: parsed[0]?.totalSentences || 0,
        wordCount: parsed[0]?.wordCount || 0
      };
    });
  } else {
    finalChapters = parseNovelText(combinedRaw || 'No readable text content found in EPUB.', docTitle);
  }

  return {
    title: docTitle,
    author: docAuthor,
    chapters: finalChapters,
    rawText: combinedRaw
  };
}
