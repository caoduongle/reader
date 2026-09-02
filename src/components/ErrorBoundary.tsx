import React from 'react';
import { AlertTriangle, RefreshCw, BookOpen } from 'lucide-react';
import { READING_POSITION_STORAGE_KEY, LEGACY_ACTIVE_DOC_KEY } from '../utils/storage';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
  isContentOnly?: boolean;
  onResetToSample?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  props: ErrorBoundaryProps;
  state: ErrorBoundaryState;
  setState: (
    state:
      | Partial<ErrorBoundaryState>
      | ((prevState: ErrorBoundaryState, props: ErrorBoundaryProps) => Partial<ErrorBoundaryState>)
  ) => void;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[VoxRead ErrorBoundary] Uncaught component error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetToSample = () => {
    try {
      localStorage.removeItem(READING_POSITION_STORAGE_KEY);
      localStorage.removeItem(LEGACY_ACTIVE_DOC_KEY);
    } catch {
      // ignore
    }

    if (this.props.onResetToSample) {
      this.setState({ hasError: false, error: null, errorInfo: null });
      this.props.onResetToSample();
    } else {
      window.location.reload();
    }
  };

  public render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const title = this.props.fallbackTitle || 'Đã xảy ra lỗi không mong muốn';
    const description =
      this.props.fallbackDescription ||
      'Một lỗi ngoài dự kiến đã xảy ra trong quá trình hiển thị giao diện.';

    if (this.props.isContentOnly) {
      return (
        <div className="flex items-center justify-center p-8 w-full min-h-[350px]">
          <div className="max-w-md w-full p-6 rounded-2xl bg-[#16161A] border border-red-500/30 shadow-2xl text-center space-y-4 backdrop-blur-md">
            <div className="w-12 h-12 mx-auto rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white tracking-wide">{title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
            </div>

            {this.state.error && (
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 text-[11px] font-mono text-red-300 text-left overflow-x-auto max-h-24">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tải lại trang</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetToSample}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Quay về tài liệu mẫu</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen w-full bg-[#0E0E11] flex items-center justify-center p-6 text-slate-200">
        <div className="max-w-lg w-full p-8 rounded-3xl bg-[#16161A] border border-red-500/40 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white tracking-wide">{title}</h1>
            <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
          </div>

          {this.state.error && (
            <div className="p-3 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-red-300 text-left overflow-x-auto max-h-36">
              {this.state.error.message || String(this.state.error)}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Tải lại trang</span>
            </button>

            <button
              type="button"
              onClick={this.handleResetToSample}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-sm font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Quay về tài liệu mẫu</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}
