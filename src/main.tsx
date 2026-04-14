
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./index.css";
  import { initializeWebVitalsMonitoring } from "./utils/web-vitals";

  const SW_ENABLED = import.meta.env.PROD && import.meta.env.VITE_ENABLE_SW === 'true';

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      if (!SW_ENABLED || import.meta.env.DEV) {
        registrations.forEach((registration) => registration.unregister());
        caches.keys().then((cacheNames) => {
          cacheNames.forEach((cacheName) => {
            caches.delete(cacheName);
          });
        });
        return;
      }

      const baseUrl = import.meta.env.BASE_URL || '/';
      const swPath = `${baseUrl}sw.js`;
      navigator.serviceWorker.register(swPath).catch((error) => {
        console.warn('Service Worker 등록 실패:', error);
      });
    });
  }

  createRoot(document.getElementById("root")!).render(<App />);

  // Web Vitals 모니터링 초기화
  initializeWebVitalsMonitoring();