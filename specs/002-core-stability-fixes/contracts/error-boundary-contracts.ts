/**
 * Interface contracts for Error Boundary components.
 */

import React from 'react';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Custom fallback title displayed on the error card */
  fallbackTitle?: string;
  /** Custom description or instructions */
  fallbackDescription?: string;
  /** If true, renders a compact scoped card suitable for inside the reader content area */
  isContentOnly?: boolean;
  /** Callback to reset active document state back to the default sample novel */
  onResetToSample?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}
