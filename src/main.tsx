
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./index.css";
  import { initializeWebVitalsMonitoring } from "./utils/web-vitals";

  createRoot(document.getElementById("root")!).render(<App />);

  // Web Vitals 모니터링 초기화
  initializeWebVitalsMonitoring();

  // Service Worker 등록 (PWA 지원)
  if ('serviceWorker' in navigator) {
    const swPath = import.meta.env.PROD ? '/convi-seat-finder/sw.js' : '/sw.js';
    navigator.serviceWorker.register(swPath).catch((error) => {
      console.warn('Service Worker 등록 실패:', error);
    });
  }