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

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onDocumentLoaded,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'samples'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Paste form state
  const [pastedTitle, setPastedTitle] = useState('');
  const [pastedAuthor, setPastedAuthor] = useState('');
  const [pastedContent, setPastedContent] = useState('');

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
        const res = await parsePdfFile(file, (p) => setProgress(p), signal);
        chapters = res.chapters;
        docTitle = res.title;
      } else if (ext === 'epub') {
        format = 'epub';
        const res = await parseEpubFile(file, (p) => setProgress(p), signal);
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
        title: docTitle || 'Imported Document',
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
          : 'Failed to process document file. Please ensure it is a valid TXT, PDF, or EPUB file.'
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
      setErrorMessage('Please paste or write some novel text.');
      return;
    }

    const title = pastedTitle.trim() || 'Untitled Story';
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
              <h2 className="text-lg font-bold text-neutral-100">Add Novel or Document</h2>
              <p className="text-xs text-neutral-400">Upload files (.txt, .pdf, .epub) or paste text directly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex px-6 pt-3 border-b border-neutral-800 gap-2 bg-neutral-950/40">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2.5 rounded-t-xl text-sm font-medium flex items-center space-x-2 transition-colors border-b-2 ${
              activeTab === 'upload'
                ? 'border-amber-500 text-amber-400 bg-neutral-800/60'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Upload File</span>
          </button>

          <button
            onClick={() => setActiveTab('paste')}
            className={`px-4 py-2.5 rounded-t-xl text-sm font-medium flex items-center space-x-2 transition-colors border-b-2 ${
              activeTab === 'paste'
                ? 'border-amber-500 text-amber-400 bg-neutral-800/60'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Clipboard className="w-4 h-4" />
            <span>Paste Text</span>
          </button>

          <button
            onClick={() => setActiveTab('samples')}
            className={`px-4 py-2.5 rounded-t-xl text-sm font-medium flex items-center space-x-2 transition-colors border-b-2 ${
              activeTab === 'samples'
                ? 'border-amber-500 text-amber-400 bg-neutral-800/60'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Classic Library</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-800/80 text-red-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: FILE UPLOAD */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
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
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleProcessFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                {isLoading ? (
                  <div
                    className="flex flex-col items-center space-y-3 py-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                    <div className="text-sm font-semibold text-neutral-200">
                      Processing Document ({progress}%)...
                    </div>
                    <div className="w-48 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 transition-all duration-200"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
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
                        Drag and drop your file here, or click to browse
                      </div>
                      <p className="text-xs text-neutral-400 mt-1">
                        Supports <span className="text-amber-400 font-mono">.txt</span>,{' '}
                        <span className="text-amber-400 font-mono">.pdf</span>,{' '}
                        <span className="text-amber-400 font-mono">.epub</span>,{' '}
                        <span className="text-amber-400 font-mono">.md</span> (Tối đa {MAX_FILE_SIZE_MB}MB)
                      </p>
                    </div>
                    <div className="inline-block px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-xs text-neutral-300 font-medium">
                      Select File From Device
                    </div>
                  </>
                )}
              </div>

              {/* Supported format badges */}
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-neutral-800/40 border border-neutral-700/60">
                  <span className="font-bold text-neutral-200 block">Plain Text (.txt, .md)</span>
                  <span className="text-[11px] text-neutral-400">Fast parsing & UTF-8</span>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-800/40 border border-neutral-700/60">
                  <span className="font-bold text-neutral-200 block">PDF Documents</span>
                  <span className="text-[11px] text-neutral-400">Client-side OCR & pages</span>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-800/40 border border-neutral-700/60">
                  <span className="font-bold text-neutral-200 block">EPUB Ebooks</span>
                  <span className="text-[11px] text-neutral-400">Chapters & spine auto-split</span>
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
                    Document Title (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. My Web Novel - Chapter 1"
                    value={pastedTitle}
                    onChange={(e) => setPastedTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-800/80 border border-neutral-700 rounded-xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Author (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Nam Cao / Arthur Conan Doyle"
                    value={pastedAuthor}
                    onChange={(e) => setPastedAuthor(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-800/80 border border-neutral-700 rounded-xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-neutral-300">
                    Novel / Article Text Content
                  </label>
                  <span className="text-[11px] font-mono text-neutral-400">
                    {pastedContent.split(/\s+/).filter(Boolean).length} words | {pastedContent.length} chars
                  </span>
                </div>
                <textarea
                  rows={8}
                  placeholder="Paste your text or chapters here... You can use 'Chapter 1', 'Chương 1', or headings to automatically divide into navigable chapters!"
                  value={pastedContent}
                  onChange={(e) => setPastedContent(e.target.value)}
                  className="w-full p-3.5 bg-neutral-950/70 border border-neutral-700 rounded-xl text-xs text-neutral-200 font-serif leading-relaxed placeholder-neutral-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  id="submit-pasted-text-btn"
                  onClick={handlePastedSubmit}
                  disabled={!pastedContent.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs flex items-center space-x-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <FileCode className="w-4 h-4" />
                  <span>Parse & Start Reading</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SAMPLE NOVELS */}
          {activeTab === 'samples' && (
            <div className="space-y-3">
              <p className="text-xs text-neutral-400">
                Choose a preloaded classic book or Vietnamese story to test TTS audio synthesis immediately:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SAMPLE_DOCUMENTS.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => {
                      onDocumentLoaded(doc);
                      onClose();
                    }}
                    className="p-4 rounded-2xl bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/70 hover:border-amber-500/60 cursor-pointer transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-semibold">
                          {doc.format.toUpperCase()}
                        </span>
                        <span className="text-xs text-neutral-500 font-mono">
                          {doc.chapters.length} {doc.chapters.length === 1 ? 'Chapter' : 'Chapters'}
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
                      <span>{doc.totalWords.toLocaleString()} words</span>
                      <span className="text-amber-400 font-medium group-hover:underline flex items-center space-x-1">
                        <span>Read now</span>
                        <BookOpen className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
