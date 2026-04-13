import React, { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary
 * 자식 컴포넌트의 렌더링 에러를 캐치하고 UI를 보여줍니다
 * - 이벤트 핸들러 에러는 캐치 안 함 (try/catch 사용)
 * - 비동기 에러는 캐치 안 함 (.catch() 또는 toast 사용)
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 프로덕션에서는 로깅 서비스로 전송
    console.error('Caught error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props;

      // 커스텀 폴백 제공 시 사용
      if (fallback && this.state.error) {
        return fallback(this.state.error, this.resetError);
      }

      // 기본 에러 UI
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
          <div className="rounded-lg border border-red-200 bg-red-50 p-8 max-w-md">
            <div className="mb-4 flex items-center justify-center">
              <AlertCircle className="h-12 w-12 text-red-600" />
            </div>
            <h1 className="mb-2 text-center text-lg font-semibold text-red-900">
              문제가 발생했습니다
            </h1>
            <p className="mb-4 text-center text-sm text-red-700">
              페이지를 새로고침하거나 다시 시도해주세요.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-4 rounded bg-red-100 p-3 font-mono text-xs text-red-900">
                <p className="font-semibold">에러 메시지:</p>
                <p className="mt-1 break-words">{this.state.error.message}</p>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full rounded bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 transition-colors"
            >
              페이지 새로고침
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Error Boundary hook (선택사항)
 * 함수형 컴포넌트에서 사용하려면 useErrorHandler 사용
 */
export function useErrorHandler(error: unknown) {
  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);
}
