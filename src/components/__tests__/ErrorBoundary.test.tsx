import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../../../components/ErrorBoundary';

// 에러를 던지는 테스트 컴포넌트
function ThrowError() {
  throw new Error('테스트 에러');
}

describe('ErrorBoundary', () => {
  // 에러 로그를 억제하기 위해 콘솔 에러를 목업
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  it('자식 컴포넌트를 렌더링해야 함', () => {
    render(
      <ErrorBoundary>
        <div>안전한 컨텐츠</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('안전한 컨텐츠')).toBeInTheDocument();
  });

  it('에러를 캐치하고 에러 UI를 표시해야 함', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // 에러 UI가 표시되는지 확인
    expect(screen.getByText('문제가 발생했습니다')).toBeInTheDocument();
    expect(screen.getByText(/페이지를 새로고침하거나 다시 시도해주세요/)).toBeInTheDocument();
  });

  it('새로고침 버튼이 존재해야 함', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const button = screen.getByRole('button', { name: /페이지 새로고침/ });
    expect(button).toBeInTheDocument();
  });

  it('커스텀 폴백을 사용할 수 있어야 함', () => {
    const customFallback = (error: Error) => (
      <div>커스텀 에러: {error.message}</div>
    );

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/커스텀 에러: 테스트 에러/)).toBeInTheDocument();
  });

  consoleErrorSpy.mockRestore();
});
