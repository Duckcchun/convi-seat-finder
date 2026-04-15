
import { useEffect } from "react";
import { Toaster } from "./components/ui/sonner";
import { StoreProvider } from './context/StoreContext';
import { AppContent } from './AppContent';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  useEffect(() => {
    try {
      // @ts-ignore
      console.log('[REMOTE_ENABLED]', import.meta.env.VITE_ENABLE_SUPABASE_REMOTE, window.location.hostname);
    } catch (e) {}
  }, []);
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
