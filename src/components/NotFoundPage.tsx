import React from 'react';
import { Compass, BookOpen, ArrowLeft } from 'lucide-react';
import { useDocumentSEO } from '../hooks/useDocumentSEO';

interface NotFoundPageProps {
  onReturnHome: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onReturnHome }) => {
  useDocumentSEO({
    title: '404 - Không tìm thấy trang',
    description: 'Trang bạn đang tìm kiếm không tồn tại hoặc đã được chuyển hướng. Quay lại VoxRead để tiếp tục trải nghiệm đọc sách.',
    noindex: true,
  });

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-200 flex flex-col items-center justify-center p-6 selection:bg-amber-500/30 selection:text-amber-200">
      <div className="max-w-md w-full p-8 rounded-3xl bg-[#16161A] border border-white/10 text-center space-y-6 shadow-2xl relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
          <Compass className="w-10 h-10 animate-pulse" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold tracking-wide uppercase">
            <span>Mã lỗi 404 • Not Found</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Không tìm thấy trang
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Đường dẫn bạn yêu cầu không tồn tại hoặc đã được thay đổi. Vui lòng quay lại trình đọc chính để tiếp tục nghe đọc sách và tài liệu.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onReturnHome}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-semibold text-sm transition-all shadow-lg shadow-amber-600/25 cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại trang đọc sách</span>
          </button>
          <button
            type="button"
            onClick={() => {
              window.history.pushState({}, '', '/');
              onReturnHome();
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium transition-all border border-white/10 cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>Về trang chủ</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
