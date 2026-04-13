/**
 * Web Vitals 성능 모니터링
 * Core Web Vitals 측정 및 분석
 */

export interface WebVitalsMetrics {
  // Largest Contentful Paint - 화면에 보이는 가장 큰 콘텐츠의 렌더링 시간
  LCP?: number;
  
  // First Input Delay - 사용자 입력부터 브라우저가 응답하기까지의 시간
  FID?: number;
  
  // Cumulative Layout Shift - 예기치 않은 레이아웃 변경
  CLS?: number;
  
  // Time to First Byte - 첫 바이트 수신 시간
  TTFB?: number;
  
  // First Contentful Paint - 첫 콘텐츠 렌더링 시간
  FCP?: number;
  
  // Interaction to Next Paint (FID 대체)
  INP?: number | null;
}

class WebVitalsMonitor {
  private metrics: Partial<WebVitalsMetrics> = {};
  private callbacks: Array<(metrics: WebVitalsMetrics) => void> = [];

  constructor() {
    this.initializeObservers();
  }

  private initializeObservers() {
    // LCP (Largest Contentful Paint)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.metrics.LCP = Math.round(lastEntry.renderTime || lastEntry.loadTime);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.warn('LCP observer failed:', e);
      }

      // CLS (Cumulative Layout Shift)
      try {
        const clsObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              this.metrics.CLS = (this.metrics.CLS || 0) + (entry as any).value;
            }
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('CLS observer failed:', e);
      }

      // FCP (First Contentful Paint)
      try {
        const fcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const fcpEntry = entries.find((entry) => entry.name === 'first-contentful-paint');
          if (fcpEntry) {
            this.metrics.FCP = Math.round(fcpEntry.startTime);
          }
        });
        fcpObserver.observe({ entryTypes: ['paint'] });
      } catch (e) {
        console.warn('FCP observer failed:', e);
      }

      // INP (Interaction to Next Paint) - FID를 대체
      try {
        const inpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const longestEntry = entries.reduce<PerformanceEntry | null>((current, entry) => {
            if (!current) return entry;
            const currentDuration = (current as any).processingDuration ?? current.duration ?? 0;
            const nextDuration = (entry as any).processingDuration ?? entry.duration ?? 0;
            return nextDuration > currentDuration ? entry : current;
          }, null);

          if (longestEntry) {
            const duration = (longestEntry as any).processingDuration ?? longestEntry.duration ?? 0;
            this.metrics.INP = Math.round(duration);
          }
        });
        inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 });
      } catch (e) {
        console.warn('INP observer failed:', e);
      }
    }

    // TTFB (Time to First Byte)
    if (performance.timing) {
      setTimeout(() => {
        const ttfb = performance.timing.responseStart - performance.timing.fetchStart;
        this.metrics.TTFB = Math.round(ttfb);
      }, 0);
    }
  }

  /**
   * 지정된 시간 후 현재 메트릭 반환
   */
  getMetrics(delayMs = 3000): Promise<WebVitalsMetrics> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.metrics as WebVitalsMetrics);
      }, delayMs);
    });
  }

  /**
   * 메트릭 변경 시마다 콜백 실행
   */
  onMetricsChange(callback: (metrics: WebVitalsMetrics) => void) {
    this.callbacks.push(callback);
  }

  /**
   * 현재 메트릭 로그 출력
   */
  logMetrics() {
    const metrics = this.metrics as WebVitalsMetrics;
    const formatMetric = (value?: number | null) => (value == null ? '측정 대기 중' : value.toFixed(0));
    const formatStatus = (value?: number | null, threshold?: number) => {
      if (value == null) return '⏳';
      if (threshold == null) return '✓';
      return value <= threshold ? '✓' : '⚠️';
    };

    console.group('📊 Web Vitals Metrics');
    console.log('LCP (Largest Contentful Paint):', formatMetric(metrics.LCP), 'ms', formatStatus(metrics.LCP, 2500));
    console.log('FCP (First Contentful Paint):', formatMetric(metrics.FCP), 'ms', formatStatus(metrics.FCP, 1800));
    console.log('CLS (Cumulative Layout Shift):', metrics.CLS == null ? '측정 대기 중' : metrics.CLS.toFixed(3), formatStatus(metrics.CLS, 0.1));
    console.log('TTFB (Time to First Byte):', formatMetric(metrics.TTFB), 'ms', formatStatus(metrics.TTFB, 600));
    console.log('INP (Interaction to Next Paint):', formatMetric(metrics.INP), 'ms', formatStatus(metrics.INP, 200));
    console.groupEnd();
  }

  /**
   * 메트릭을 분석 서버로 전송 (선택사항)
   */
  async sendMetrics(endpoint: string) {
    const metrics = this.metrics as WebVitalsMetrics;
    try {
      await fetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          ...metrics,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      });
    } catch (error) {
      console.warn('Failed to send metrics:', error);
    }
  }
}

// 싱글톤 인스턴스
export const vitalsMonitor = new WebVitalsMonitor();

/**
 * React 애플리케이션 초기화 시 호출
 */
export function initializeWebVitalsMonitoring() {
  // 개발 환경에서 자동으로 메트릭 로그
  if (import.meta.env.DEV) {
    setTimeout(() => {
      vitalsMonitor.logMetrics();
    }, 5000);
  }

  // 페이지 언로드 시 메트릭 기록
  window.addEventListener('beforeunload', () => {
    vitalsMonitor.logMetrics();
  });
}

export default vitalsMonitor;
