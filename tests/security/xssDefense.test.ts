import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { sanitizeForRender } from '../../src/utils/clientSanitizer';
import { ReaderContent } from '../../src/components/ReaderContent';
import { Chapter, TTSSettings } from '../../src/types';

describe('XSS Defense & Client Sanitization (FR-007, FR-008)', () => {
  it('strips <script> tags and active JavaScript payloads completely', () => {
    const dirty = '<p>An toàn</p><script>alert("hacked")</script>';
    const clean = sanitizeForRender(dirty);
    expect(clean).toContain('<p>An toàn</p>');
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('alert');
  });

  it('strips inline event handlers (onerror, onload, onclick)', () => {
    const dirty = '<img src="invalid-image.jpg" onerror="alert(document.cookie)" /><b onclick="alert(1)">Click</b>';
    const clean = sanitizeForRender(dirty);
    expect(clean).not.toContain('onerror');
    expect(clean).not.toContain('onclick');
    expect(clean).not.toContain('alert');
  });

  it('strips javascript: pseudo-protocols from links', () => {
    const dirty = '<a href="javascript:alert(1)">Nhấp vào đây</a>';
    const clean = sanitizeForRender(dirty);
    expect(clean).not.toContain('javascript:');
  });

  it('preserves legitimate formatting tags needed for novel reading', () => {
    const richNovelText = '<h1>Chương 1</h1><p>Đêm <i>thanh vắng</i>, gió <b>thổi mạnh</b>.</p><blockquote>Một trích dẫn đẹp</blockquote>';
    const clean = sanitizeForRender(richNovelText);
    expect(clean).toContain('<h1>Chương 1</h1>');
    expect(clean).toContain('<i>thanh vắng</i>');
    expect(clean).toContain('<b>thổi mạnh</b>');
    expect(clean).toContain('<blockquote>Một trích dẫn đẹp</blockquote>');
  });

  it('ReaderContent securely sanitizes chapter htmlContent before rendering to DOM', () => {
    const mockChapter: Chapter = {
      id: 'ch-xss-test',
      title: 'Chương Kiểm Thử Bảo Mật',
      paragraphs: [],
      totalSentences: 0,
      wordCount: 10,
      htmlContent: '<p>Nội dung an toàn</p><script>window.pwned = true;</script><iframe src="https://evil.com"></iframe>',
    };

    const mockSettings: TTSSettings = {
      ttsProvider: 'browser',
      rvcServerUrl: 'http://127.0.0.1:8008',
      voiceURI: 'vi-VN-Standard-A',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      highlightStyle: 'soft-gold',
      autoScroll: true,
      continuousReading: false,
      mascotEnabled: false,
      mascotType: 'fox',
      mascotBounceAnimation: false,
      mascotBlinkAnimation: false,
      mascotFloatingAnimation: false,
      mascotSpeechBubble: false,
      fontSize: 18,
      lineHeight: 1.8,
      contentWidth: 'medium',
      fontFamily: 'merriweather',
      theme: 'dark',
    };

    const { container } = render(
      React.createElement(ReaderContent, {
        currentChapter: mockChapter,
        chapterIndex: 0,
        totalChapters: 1,
        currentSentenceIndex: 0,
        isPlaying: false,
        isPaused: false,
        settings: mockSettings,
        onSentenceClick: () => {},
        onPrevChapter: () => {},
        onNextChapter: () => {},
        onOpenUpload: () => {},
      })
    );

    // Verify sanitized container exists
    const sanitizedContainer = container.querySelector('[data-testid="sanitized-html-content"]');
    expect(sanitizedContainer).not.toBeNull();
    expect(sanitizedContainer?.innerHTML).toContain('<p>Nội dung an toàn</p>');
    // Assert dangerous elements were stripped from DOM
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('iframe')).toBeNull();
  });
});
