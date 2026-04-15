/**
 * Service Worker
 * 오프라인 캐싱 및 백그라운드 동기화
 */

const CACHE_NAME = 'convi-seat-finder-v4';
const RUNTIME_CACHE = 'convi-seat-finder-runtime-v4';
const BASE_PATH = new URL(self.registration.scope).pathname.replace(/\/$/, '');
const APP_ROOT = BASE_PATH ? `${BASE_PATH}/` : '/';
const APP_INDEX = `${APP_ROOT}index.html`;

// 캐시할 정적 자산
const STATIC_ASSETS = [
  '/',
  APP_ROOT,
  APP_INDEX,
];

// Service Worker 설치 이벤트
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Failed to cache static assets:', err);
        // 캐시 실패는 무시하고 계속 진행
      });
    }),
  );
  self.skipWaiting();
});

// Service Worker 활성화 이벤트
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

// Fetch 이벤트 - 네트워크 우선, 실패 시 캐시
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // GET 요청만 처리
  if (request.method !== 'GET') {
    return;
  }

  // 외부 도메인 요청은 무시
  if (url.origin !== location.origin) {
    return;
  }

  // API 요청은 네트워크 우선 (Supabase)
  if (url.pathname.includes('/rest/') || url.pathname.includes('/functions/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 성공한 응답은 캐시에 저장
          if (response.status === 200) {
            const cache = caches.open(RUNTIME_CACHE);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // 네트워크 실패 시 캐시에서 가져오기
          return caches.match(request).then((response) => {
            if (response) {
              return response;
            }
            // 캐시도 없으면 오프라인 응답
            return caches.match(APP_INDEX);
          });
        }),
    );
    return;
  }

  // HTML 네비게이션은 네트워크 우선으로 최신 배포 반영
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(APP_INDEX, cloned);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(APP_INDEX);
        }),
    );
    return;
  }

  // 정적 자산은 캐시 우선
  event.respondWith(
    caches
      .match(request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(request).then((response) => {
          // 성공한 응답 캐시
          if (response.status === 200) {
            const clonedResponse = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, clonedResponse);
            });
          }
          return response;
        });
      })
      .catch(() => {
        // 모든 시도 실패 시 인덱스 페이지 반환
        return caches.match(APP_INDEX);
      }),
  );
});

// 백그라운드 동기화 (선택사항)
// 사용자가 오프라인에서 데이터를 제보하면, 인터넷 복구 시 자동으로 전송
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reports') {
    event.waitUntil(syncReports());
  }
});

async function syncReports() {
  try {
    const db = await openIndexedDB();
    const reports = await getAllPendingReports(db);

    for (const report of reports) {
      try {
        const response = await fetch(`${APP_ROOT}api/reports`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report),
        });

        if (response.ok) {
          await removePendingReport(db, report.id);
        }
      } catch (error) {
        console.error('Failed to sync report:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ConviSeatFinder', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('pendingReports', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllPendingReports(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingReports', 'readonly');
    const store = tx.objectStore('pendingReports');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function removePendingReport(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingReports', 'readwrite');
    const store = tx.objectStore('pendingReports');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
