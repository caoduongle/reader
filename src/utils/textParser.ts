import { Chapter, ParagraphItem, SentenceItem } from '../types';

/**
 * Splits text into sentences intelligently across multiple languages,
 * preserving abbreviations like Mr., Dr., vs., e.g., i.e., etc.,
 * and handling punctuation in English, Vietnamese, Japanese, etc.
 */
export function splitIntoSentences(text: string): string[] {
  if (!text || !text.trim()) return [];

  // Protect common abbreviations by replacing period with a placeholder
  const protectedText = text
    // English & Vietnamese titles, administrative terms, and common abbreviations
    .replace(
      /(?<=\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|e\.g|i\.e|No|Vol|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec|St|Ave|TP|TX|TT|Q|P|H|X|GS|PGS|TS|ThS|BS|DS|CN|KTS|LS|KS|NXB|HĐND|UBND|THPT|THCS|TH|ĐH|CĐ|TC|Th\.S|P\.GS|T\.S|v\.v|v\.\.v|đ\/c|Đ\/c))\./gi,
      '§DOT§'
    )
    .replace(/(?<=\b[A-Z])\./g, '§DOT§') // Single initials like "J. K. Rowling" or "Nguyễn V. A"
    .replace(/(\d+)\.(\d+)/g, '$1§DEC§$2'); // Decimals like 3.14

  // Match sentences ending with ., !, ?, or Japanese punctuation 。, ！, ？
  // followed by space, quote, or end of text
  const rawSentences: string[] = [];
  const regex = /([^.!?。！？\n]+[.!?。！？]+["'”’»\)\]]*|[^.!?。！？\n]+$)/g;
  
  let match: RegExpExecArray | null;
  while ((match = regex.exec(protectedText)) !== null) {
    const matchedStr = match[0].trim();
    if (matchedStr) {
      // Restore placeholder dots
      const restored = matchedStr
        .replace(/§DOT§/g, '.')
        .replace(/§DEC§/g, '.');
      rawSentences.push(restored);
    }
  }

  // Fallback if regex yielded nothing (e.g. single line without ending punctuation)
  if (rawSentences.length === 0 && text.trim()) {
    return [text.trim()];
  }

  return rawSentences.filter(s => s.trim().length > 0);
}

/**
 * Parses raw text into chapters, paragraphs, and indexed sentences.
 */
export function parseNovelText(rawText: string, defaultTitle: string = 'Untitled Document'): Chapter[] {
  if (!rawText || !rawText.trim()) {
    return [{
      id: 'chap-default',
      title: defaultTitle,
      paragraphs: [],
      totalSentences: 0,
      wordCount: 0
    }];
  }

  // Normalize line endings
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Detect potential chapter markers
  // e.g. "Chapter 1", "Chương 1", "CHAPTER I", "Part 1", "Phần 1", "# Chapter", etc.
  const chapterRegex = /(?:^|\n)(?=(?:(?:CHAPTER|Chapter|CHƯƠNG|Chương|CH|Hồi|Phần|PART|Part|Section|Mục|#)\s+(?:\d+|[IVXLCDM]+|[A-Za-z]+)(?:[:.-].*)?|\*{3,}|#{1,3}\s+.*)(?:\n|$))/i;
  
  const rawChapterChunks = normalized.split(chapterRegex);

  // If no chapter divisions detected or only 1 chunk, treat as 1 chapter
  let chapterSections: { title: string; content: string }[] = [];

  if (rawChapterChunks.length <= 1) {
    chapterSections.push({
      title: defaultTitle,
      content: normalized
    });
  } else {
    rawChapterChunks.forEach((chunk, index) => {
      const trimmed = chunk.trim();
      if (!trimmed) return;

      const lines = trimmed.split('\n');
      const firstLine = lines[0].trim();

      // Check if first line looks like a chapter title
      const isTitleLine = /^(?:CHAPTER|Chapter|CHƯƠNG|Chương|CH|Hồi|Phần|PART|Part|Section|Mục|#|\*{3})/i.test(firstLine) || firstLine.length < 80;
      
      let title = `Chapter ${chapterSections.length + 1}`;
      let content = trimmed;

      if (isTitleLine && lines.length > 1) {
        title = firstLine.replace(/^#+\s*/, '').trim();
        content = lines.slice(1).join('\n').trim();
      } else if (index === 0 && !isTitleLine) {
        title = 'Prologue / Introduction';
      }

      chapterSections.push({ title, content });
    });
  }

  // If for some reason we have 0 sections
  if (chapterSections.length === 0) {
    chapterSections = [{ title: defaultTitle, content: normalized }];
  }

  // Now transform each section into Chapter structure
  return chapterSections.map((sec, chapIdx) => {
    // Split into paragraphs (empty line or multiple newlines)
    const rawParagraphs = sec.content
      .split(/\n\s*\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    let globalSentenceCounter = 0;
    const paragraphs: ParagraphItem[] = [];

    rawParagraphs.forEach((pText, pIdx) => {
      const sentenceStrings = splitIntoSentences(pText);
      const sentences: SentenceItem[] = sentenceStrings.map((sText, sIdx) => {
        const item: SentenceItem = {
          id: `c${chapIdx}-p${pIdx}-s${sIdx}`,
          globalIndex: globalSentenceCounter++,
          paragraphIndex: pIdx,
          sentenceIndex: sIdx,
          text: sText
        };
        return item;
      });

      if (sentences.length > 0) {
        paragraphs.push({
          id: `c${chapIdx}-p${pIdx}`,
          paragraphIndex: pIdx,
          sentences,
          rawText: pText
        });
      }
    });

    const totalWords = sec.content.split(/\s+/).filter(w => w.length > 0).length;

    return {
      id: `chap-${chapIdx + 1}`,
      title: sec.title || `Chapter ${chapIdx + 1}`,
      paragraphs,
      totalSentences: globalSentenceCounter,
      wordCount: totalWords
    };
  });
}

/**
 * Calculates estimated reading time in minutes (average 200 WPM)
 */
export function calculateReadingTimeMinutes(words: number, speedMultiplier: number = 1): number {
  const baseWpm = 200 * speedMultiplier;
  return Math.max(1, Math.ceil(words / baseWpm));
}
