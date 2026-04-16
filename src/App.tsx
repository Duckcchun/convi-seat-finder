
import { useEffect } from "react";
import { Toaster } from "./components/ui/sonner";
import { StoreProvider } from './context/StoreContext';
import { AppContent } from './AppContent';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  // 디버깅용 로그 제거 (배포용)
  return (
    <>
      <ErrorBoundary>
        <StoreProvider>
          <AppContent />
        </StoreProvider>
      </ErrorBoundary>
      <Toaster />
    </>
  );
}
