import { describe, it, expect } from 'vitest';
import { splitIntoSentences, parseNovelText } from '../../src/utils/textParser';

describe('splitIntoSentences', () => {
  it('splits regular sentences ending in period, exclamation, and question mark', () => {
    const input = 'Đây là câu thứ nhất. Câu thứ hai thật tuyệt vời! Bạn có đồng ý không?';
    const result = splitIntoSentences(input);

    expect(result).toHaveLength(3);
    expect(result[0]).toBe('Đây là câu thứ nhất.');
    expect(result[1]).toBe('Câu thứ hai thật tuyệt vời!');
    expect(result[2]).toBe('Bạn có đồng ý không?');
  });

  it('protects abbreviations and initials from being prematurely split', () => {
    const input = 'Bác sĩ Dr. John và ThS. Nguyễn V. A đã đến TP. HCM để công tác.';
    const result = splitIntoSentences(input);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(
      'Bác sĩ Dr. John và ThS. Nguyễn V. A đã đến TP. HCM để công tác.'
    );
  });

  it('preserves floating-point and decimal numbers without splitting', () => {
    const input = 'Phiên bản 3.14 của ứng dụng có kích thước 45.8 MB.';
    const result = splitIntoSentences(input);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe('Phiên bản 3.14 của ứng dụng có kích thước 45.8 MB.');
  });

  it('handles dialogue quotes and Japanese CJK punctuation', () => {
    const input = 'Cô ấy nói: "Tôi sẽ quay lại!" Sau đó cô rời đi。Một ngày mới bắt đầu！';
    const result = splitIntoSentences(input);

    expect(result).toHaveLength(3);
    expect(result[0]).toBe('Cô ấy nói: "Tôi sẽ quay lại!"');
    expect(result[1]).toBe('Sau đó cô rời đi。');
    expect(result[2]).toBe('Một ngày mới bắt đầu！');
  });

  it('returns empty array when given empty string or whitespace only', () => {
    expect(splitIntoSentences('')).toEqual([]);
    expect(splitIntoSentences('   \n\t  ')).toEqual([]);
  });
});

describe('parseNovelText', () => {
  it('parses chapters and assigns contiguous sequential globalIndex within each chapter', () => {
    const rawContent = `Chương 1: Khởi đầu
Đây là câu mở đầu. Câu tiếp theo ở đây.

Chương 2: Thử thách
Một thử thách mới xuất hiện! Kết thúc chương hai.`;

    const chapters = parseNovelText(rawContent, 'Tác Phẩm Mẫu');

    expect(chapters).toHaveLength(2);
    expect(chapters[0].title).toBe('Chương 1: Khởi đầu');
    expect(chapters[1].title).toBe('Chương 2: Thử thách');

    const chap1Sentences = chapters[0].paragraphs.flatMap(p => p.sentences);
    const chap2Sentences = chapters[1].paragraphs.flatMap(p => p.sentences);

    expect(chap1Sentences).toHaveLength(2);
    expect(chap1Sentences.map(s => s.globalIndex)).toEqual([0, 1]);
    expect(chapters[0].totalSentences).toBe(2);

    expect(chap2Sentences).toHaveLength(2);
    expect(chap2Sentences.map(s => s.globalIndex)).toEqual([0, 1]);
    expect(chapters[1].totalSentences).toBe(2);

    expect(chapters[0].wordCount).toBeGreaterThan(0);
    expect(chapters[1].wordCount).toBeGreaterThan(0);
  });
});
