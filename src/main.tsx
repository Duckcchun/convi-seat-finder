
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./index.css";
  import { initializeWebVitalsMonitoring } from "./utils/web-vitals";

  if (import.meta.env.DEV && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });

    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        caches.delete(cacheName);
      });
    });
  }

  createRoot(document.getElementById("root")!).render(<App />);

  // Web Vitals 모니터링 초기화
  initializeWebVitalsMonitoring();

  // Service Worker 등록 (PWA 지원)
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const swPath = `${baseUrl}sw.js`;
    navigator.serviceWorker.register(swPath).catch((error) => {
      console.warn('Service Worker 등록 실패:', error);
    });
  }