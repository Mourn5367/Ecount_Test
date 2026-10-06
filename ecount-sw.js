// 배포할 때 VERSION 값을 변경하면 기존 설치 사용자에게 업데이트를 안내합니다.
const VERSION = 'v1.0.0';
const BASE = new URL('./', self.location.href);
const CACHE_PREFIX = `ecount-usage-${encodeURIComponent(BASE.pathname)}-`;
const CACHE_NAME = CACHE_PREFIX + VERSION;
const APP_URL = new URL('ecount_daily_usage.html', BASE).href;
const ASSETS = [
  './', './index.html', './ecount_daily_usage.html', './ecount-pwa.js',
  './ecount-manifest.webmanifest', './ecount-icons/icon-192.png',
  './ecount-icons/icon-512.png', './ecount-icons/icon-maskable-512.png',
  './ecount-icons/apple-touch-icon.png'
].map(path => new URL(path, BASE).href);
const PATHS = new Set(ASSETS.map(url => new URL(url).pathname));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  // 같은 경로에 있는 다른 자료나 다른 서비스의 응답은 캐시하지 않습니다.
  if (request.method !== 'GET' || url.origin !== BASE.origin || !PATHS.has(url.pathname)) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      // HTML과 스크립트를 같은 버전으로 유지합니다. 새 버전은 업데이트 버튼으로 적용합니다.
      const cached = await cache.match(request, { ignoreSearch: true }) || await cache.match(APP_URL);
      if (cached) return cached;
      return fetch(request);
    })());
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    return (await cache.match(request, { ignoreSearch: true })) || fetch(request);
  })());
});
