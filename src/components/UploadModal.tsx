import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  BookOpen,
  Clipboard,
  Sparkles,
  Loader2,
  AlertCircle,
  FileCode,
  Globe,
} from 'lucide-react';
import { DocumentItem } from '../types';
import {
  parseTxtFile,
  parsePdfFile,
  parseEpubFile,
  MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_BYTES,
} from '../utils/fileParser';
import { parseNovelText } from '../utils/textParser';
import { SAMPLE_DOCUMENTS } from '../utils/sampleNovels';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentLoaded: (doc: DocumentItem) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onDocumentLoaded }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'samples' | 'url'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Paste form state
  const [pastedTitle, setPastedTitle] = useState('');
  const [pastedAuthor, setPastedAuthor] = useState('');
  const [pastedContent, setPastedContent] = useState('');

  // URL form state
  const [urlInput, setUrlInput] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleProcessFile = async (file: File) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(`Tệp vượt quá dung lượng tối đa cho phép (${MAX_FILE_SIZE_MB}MB).`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setProgress(10);

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    try {
      let docTitle = file.name.replace(/\.[^/.]+$/, '');
      let docAuthor: string | undefined = undefined;
      let chapters = [];
      let format: 'txt' | 'pdf' | 'epub' = 'txt';

      if (ext === 'pdf') {
        format = 'pdf';
        const res = await parsePdfFile(file, p => setProgress(p), signal);
        chapters = res.chapters;
        docTitle = res.title;
      } else if (ext === 'epub') {
        format = 'epub';
        const res = await parseEpubFile(file, p => setProgress(p), signal);
        chapters = res.chapters;
        docTitle = res.title;
        docAuthor = res.author;
      } else {
        // txt, md, etc.
        format = 'txt';
        const res = await parseTxtFile(file, signal);
        chapters = res.chapters;
        docTitle = res.title;
      }

      const totalWords = chapters.reduce((acc, c) => acc + c.wordCount, 0);
      const totalSentences = chapters.reduce((acc, c) => acc + c.totalSentences, 0);

      if (totalSentences === 0 || totalWords === 0) {
        setErrorMessage('Tệp không có nội dung văn bản hợp lệ.');
        setIsLoading(false);
        setProgress(0);
        abortControllerRef.current = null;
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const newDoc: DocumentItem = {
        id: `doc-${Date.now()}`,
        title: docTitle || 'Tài liệu đã nhập',
        author: docAuthor,
        format,
        chapters,
        createdAt: Date.now(),
        lastRead: {
          chapterIndex: 0,
          sentenceIndex: 0,
          progressPercentage: 0,
          updatedAt: Date.now(),
        },
        totalWords,
        totalSentences,
      };

      onDocumentLoaded(newDoc);
      onClose();
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.log('[UploadModal] File parsing aborted by user.');
        setErrorMessage('Đã huỷ xử lý tệp.');
        return;
      }
      console.error('File parsing error:', err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Không thể xử lý tệp tài liệu. Vui lòng đảm bảo tệp định dạng TXT, PDF hoặc EPUB hợp lệ.'
      );
    } finally {
      setIsLoading(false);
      setProgress(0);
      abortControllerRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handlePastedSubmit = () => {
    if (!pastedContent.trim()) {
      setErrorMessage('Vui lòng dán hoặc nhập nội dung văn bản tiểu thuyết.');
      return;
    }

    const title = pastedTitle.trim() || 'Tác phẩm mới';
    const chapters = parseNovelText(pastedContent, title);
    const totalWords = chapters.reduce((acc, c) => acc + c.wordCount, 0);
    const totalSentences = chapters.reduce((acc, c) => acc + c.totalSentences, 0);

    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}`,
      title,
      author: pastedAuthor.trim() || undefined,
      format: 'pasted',
      chapters,
      createdAt: Date.now(),
      lastRead: {
        chapterIndex: 0,
        sentenceIndex: 0,
        progressPercentage: 0,
        updatedAt: Date.now(),
      },
      totalWords,
      totalSentences,
    };

    onDocumentLoaded(newDoc);
    onClose();
  };

  const handleUrlSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUrl = urlInput.trim();
    if (!cleanUrl) {
      setErrorMessage('Vui lòng nhập địa chỉ liên kết (URL).');
      return;
    }

    setIsFetchingUrl(true);
    setErrorMessage(null);

    try {
      const proxyBase = 'http://127.0.0.1:3001';
      const res = await fetch(`${proxyBase}/api/fetch-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: cleanUrl }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMessage(
          data?.error || `Không thể tải nội dung liên kết (mã lỗi HTTP ${res.status}).`
        );
        setIsFetchingUrl(false);
        return;
      }

      const title = (data.title || 'Bài viết từ liên kết').trim();
      const content = (data.content || '').trim();
      const chapters = parseNovelText(content, title);
      const totalWords = chapters.reduce((acc, c) => acc + c.wordCount, 0);
      const totalSentences = chapters.reduce((acc, c) => acc + c.totalSentences, 0);

      if (totalSentences === 0 || totalWords === 0) {
        setErrorMessage('Không trích xuất được văn bản hợp lệ từ liên kết này.');
        setIsFetchingUrl(false);
        return;
      }

      const newDoc: DocumentItem = {
        id: `doc-${Date.now()}`,
        title,
        author: data.byline || data.siteName || undefined,
        format: 'url',
        chapters,
        createdAt: Date.now(),
        lastRead: {
          chapterIndex: 0,
          sentenceIndex: 0,
          progressPercentage: 0,
          updatedAt: Date.now(),
        },
        totalWords,
        totalSentences,
      };

      onDocumentLoaded(newDoc);
      setUrlInput('');
      onClose();
    } catch (err: unknown) {
      console.error('[UploadModal] Fetch URL error:', err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Không thể kết nối đến server proxy để lấy nội dung liên kết.'
      );
    } finally {
      setIsFetchingUrl(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="upload-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none"
    >
      <div
        id="upload-modal-dialog"
        className="w-full max-w-2xl bg-neutral-900 text-neutral-100 rounded-3xl shadow-2xl border border-neutral-800 flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-100">Thêm tiểu thuyết & tài liệu</h2>
              <p className="text-xs text-neutral-400">
                Tải tệp (.txt, .pdf, .epub) hoặc dán trực tiếp nội dung văn bản
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại tải sách"
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex px-6 pt-3 border-b border-neutral-800 gap-2 bg-neutral-950/40">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2.5 rounded-t-xl text-sm font-medium flex items-center space-x-2 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'upload'
                ? 'border-amber-500 text-amber-400 bg-neutral-800/60'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Tải tệp</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`px-4 py-2.5 rounded-t-xl text-sm font-medium flex items-center space-x-2 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'paste'
                ? 'border-amber-500 text-amber-400 bg-neutral-800/60'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Clipboard className="w-4 h-4" />
            <span>Dán văn bản</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('samples')}
            className={`px-4 py-2.5 rounded-t-xl text-sm font-medium flex items-center space-x-2 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'samples'
                ? 'border-amber-500 text-amber-400 bg-neutral-800/60'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Thư viện mẫu</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('url')}
            id="tab-url-btn"
            className={`px-4 py-2.5 rounded-t-xl text-sm font-medium flex items-center space-x-2 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'url'
                ? 'border-amber-500 text-amber-400 bg-neutral-800/60'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Đọc từ liên kết</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-800/80 text-red-300 text-xs flex items-center justify-between gap-2 shadow-sm animate-in fade-in duration-200">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="p-1 rounded-lg hover:bg-red-900/40 text-red-400 hover:text-red-200 transition-colors cursor-pointer"
                aria-label="Đóng thông báo lỗi"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* TAB 1: FILE UPLOAD */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
                  isDragging
                    ? 'border-amber-500 bg-amber-500/10 scale-[0.99]'
                    : 'border-neutral-700 hover:border-amber-500/60 bg-neutral-800/40 hover:bg-neutral-800/70'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.pdf,.epub,.md,.text"
                  onChange={e => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleProcessFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                {isLoading ? (
                  <div
                    className="flex flex-col items-center space-y-3 py-4"
                    onClick={e => e.stopPropagation()}
                  >
                    <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                    <div className="text-sm font-semibold text-neutral-200">
                      Đang xử lý tài liệu ({progress}%)...
                    </div>
                    <div className="w-48 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 transition-all duration-200"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        abortControllerRef.current?.abort();
                        setIsLoading(false);
                        setProgress(0);
                      }}
                      className="mt-2 px-4 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Huỷ xử lý</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                      <Upload className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-neutral-100">
                        Kéo thả tệp vào đây hoặc nhấp để duyệt tìm
                      </div>
                      <p className="text-xs text-neutral-400 mt-1">
                        Hỗ trợ <span className="text-amber-400 font-mono">.txt</span>,{' '}
                        <span className="text-amber-400 font-mono">.pdf</span>,{' '}
                        <span className="text-amber-400 font-mono">.epub</span>,{' '}
                        <span className="text-amber-400 font-mono">.md</span> (Tối đa{' '}
                        {MAX_FILE_SIZE_MB}MB)
                      </p>
                    </div>
                    <div className="inline-block px-3.5 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-xs text-neutral-300 font-medium hover:bg-neutral-700 transition-colors">
                      Chọn tệp từ thiết bị
                    </div>
                  </>
                )}
              </div>

              {/* Supported format badges */}
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-neutral-800/40 border border-neutral-700/60">
                  <span className="font-bold text-neutral-200 block">Văn bản thô (.txt, .md)</span>
                  <span className="text-[11px] text-neutral-400">Xử lý nhanh & chuẩn UTF-8</span>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-800/40 border border-neutral-700/60">
                  <span className="font-bold text-neutral-200 block">Tài liệu PDF</span>
                  <span className="text-[11px] text-neutral-400">Trích xuất trang & văn bản</span>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-800/40 border border-neutral-700/60">
                  <span className="font-bold text-neutral-200 block">Sách EPUB</span>
                  <span className="text-[11px] text-neutral-400">Tự động phân tách chương</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PASTE TEXT */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Tiêu đề tác phẩm (không bắt buộc)
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Dế Mèn Phiêu Lưu Ký - Chương 1"
                    value={pastedTitle}
                    onChange={e => setPastedTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-800/80 border border-neutral-700 rounded-xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Tác giả (không bắt buộc)
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Tô Hoài / Nam Cao"
                    value={pastedAuthor}
                    onChange={e => setPastedAuthor(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-800/80 border border-neutral-700 rounded-xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-neutral-300">
                    Nội dung văn bản / tiểu thuyết
                  </label>
                  <span className="text-[11px] font-mono text-neutral-400">
                    {pastedContent.split(/\s+/).filter(Boolean).length} từ |{' '}
                    {pastedContent.length} ký tự
                  </span>
                </div>
                <textarea
                  rows={8}
                  placeholder="Dán hoặc nhập nội dung văn bản tại đây... Bạn có thể dùng 'Chương 1', 'Hồi 1', 'Chapter 1' hoặc các tiêu đề để hệ thống tự động tách chương thuận tiện khi đọc!"
                  value={pastedContent}
                  onChange={e => setPastedContent(e.target.value)}
                  className="w-full p-3.5 bg-neutral-950/70 border border-neutral-700 rounded-xl text-xs text-neutral-200 font-serif leading-relaxed placeholder-neutral-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  id="submit-pasted-text-btn"
                  onClick={handlePastedSubmit}
                  disabled={!pastedContent.trim()}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs flex items-center space-x-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer touch-manipulation"
                  aria-label="Phân tích văn bản và bắt đầu đọc"
                >
                  <FileCode className="w-4 h-4" />
                  <span>Phân tích & Bắt đầu đọc</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SAMPLE NOVELS */}
          {activeTab === 'samples' && (
            <div className="space-y-3">
              <p className="text-xs text-neutral-400">
                Chọn một tác phẩm văn học kinh điển hoặc truyện mẫu để trải nghiệm giọng đọc TTS ngay lập tức:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SAMPLE_DOCUMENTS.map(doc => (
                  <div
                    key={doc.id}
                    onClick={() => {
                      onDocumentLoaded(doc);
                      onClose();
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onDocumentLoaded(doc);
                        onClose();
                      }
                    }}
                    aria-label={`Đọc tác phẩm ${doc.title}`}
                    className="p-4 rounded-2xl bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/70 hover:border-amber-500/60 cursor-pointer transition-all flex flex-col justify-between group focus:outline-none focus:border-amber-500"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-semibold">
                          {doc.format.toUpperCase()}
                        </span>
                        <span className="text-xs text-neutral-500 font-mono">
                          {doc.chapters.length} {doc.chapters.length === 1 ? 'chương' : 'chương'}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-neutral-100 group-hover:text-amber-400 transition-colors mt-2">
                        {doc.title}
                      </h4>
                      {doc.author && (
                        <p className="text-xs text-neutral-400 mt-0.5">{doc.author}</p>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-neutral-700/50 flex items-center justify-between text-[11px] text-neutral-400">
                      <span>{doc.totalWords.toLocaleString()} từ</span>
                      <span className="text-amber-400 font-medium group-hover:underline flex items-center space-x-1">
                        <span>Đọc ngay</span>
                        <BookOpen className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: URL IMPORT */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div className="text-xs text-neutral-400">
                Nhập địa chỉ URL của bài báo, chương truyện hoặc bài viết trên web để VoxRead tự
                động trích xuất nội dung và sẵn sàng đọc bằng giọng TTS.
              </div>

              <form onSubmit={handleUrlSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="url-input"
                    className="block text-xs font-semibold text-neutral-300 mb-1.5"
                  >
                    Đường dẫn bài viết (URL)
                  </label>
                  <div className="relative">
                    <input
                      id="url-input"
                      type="url"
                      value={urlInput}
                      onChange={e => setUrlInput(e.target.value)}
                      placeholder="https://vnexpress.net/... hoặc https://truyenfull.io/..."
                      disabled={isFetchingUrl}
                      className="w-full px-4 py-3 pl-10 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm focus:outline-none focus:border-amber-500 transition-colors font-mono disabled:opacity-50"
                    />
                    <Globe className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isFetchingUrl}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Huỷ
                  </button>
                  <button
                    type="submit"
                    id="submit-url-btn"
                    disabled={!urlInput.trim() || isFetchingUrl}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    {isFetchingUrl ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang lấy nội dung...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Lấy nội dung</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
