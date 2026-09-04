import React from 'react';
import { Home, ChevronRight, BookOpen } from 'lucide-react';

interface BreadcrumbNavProps {
  documentTitle?: string;
  chapterTitle?: string;
  onOpenTOC?: () => void;
  className?: string;
}

/**
 * Semantic Breadcrumb Navigation component adhering to Schema.org and WAI-ARIA standards.
 */
export const BreadcrumbNav: React.FC<BreadcrumbNavProps> = ({
  documentTitle,
  chapterTitle,
  onOpenTOC,
  className = '',
}) => {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center text-xs text-slate-400 select-none ${className}`}
    >
      <ol className="flex items-center space-x-1.5 list-none m-0 p-0 overflow-x-auto no-scrollbar">
        <li className="flex items-center shrink-0">
          <a
            href="/"
            title="Về trang chủ"
            className="flex items-center gap-1 hover:text-amber-400 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Trang chủ</span>
          </a>
        </li>

        {documentTitle && (
          <li className="flex items-center shrink-0">
            <ChevronRight className="w-3 h-3 text-slate-600 mx-0.5" />
            <button
              type="button"
              onClick={onOpenTOC}
              title="Xem mục lục chương"
              className="flex items-center gap-1 text-slate-300 hover:text-amber-400 transition-colors max-w-[130px] sm:max-w-[200px] md:max-w-xs truncate font-medium cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0 opacity-70" />
              <span className="truncate">{documentTitle}</span>
            </button>
          </li>
        )}

        {chapterTitle && (
          <li className="flex items-center shrink-0" aria-current="page">
            <ChevronRight className="w-3 h-3 text-slate-600 mx-0.5" />
            <span className="text-amber-400/90 font-medium max-w-[140px] sm:max-w-[220px] md:max-w-xs truncate">
              {chapterTitle}
            </span>
          </li>
        )}
      </ol>
    </nav>
  );
};

export default BreadcrumbNav;
