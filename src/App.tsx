import { Toaster } from "./components/ui/sonner";
import { StoreProvider } from './context/StoreContext';
import { AppContent } from './AppContent';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
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
