import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';

const ProblemChild: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Sự cố giả lập để kiểm thử ErrorBoundary');
  }
  return <div>Nội dung an toàn của người dùng</div>;
};

describe('ErrorBoundary Component', () => {
  // Silence console.error in tests for expected thrown errors
  const originalConsoleError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('renders children correctly when no exception is thrown', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Nội dung an toàn của người dùng')).toBeInTheDocument();
  });

  it('catches render error and displays fallback message and technical details', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Nội dung an toàn của người dùng')).not.toBeInTheDocument();
    expect(screen.getByText('Đã xảy ra lỗi không mong muốn')).toBeInTheDocument();
    expect(
      screen.getByText(/Sự cố giả lập để kiểm thử ErrorBoundary/)
    ).toBeInTheDocument();
  });

  it('renders custom fallback title when provided via props', () => {
    render(
      <ErrorBoundary fallbackTitle="Lỗi hiển thị thành phần">
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Lỗi hiển thị thành phần')).toBeInTheDocument();
  });
});
