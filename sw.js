const CACHE_NAME = 'tokyo-2026-pwa-v7';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // 針對 Safari 導覽請求（解決 Cloudflare 308 轉址與 redirected response 限制）
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          // 若雲端回應帶有 redirected 標記，從快取取出乾淨的 ./index.html 回傳給 Safari
          if (res.redirected) {
            return caches.match('./index.html').then((cached) => cached || Response.redirect(res.url, 302));
          }
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networked = fetch(event.request)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic' && !res.redirected) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || networked;
    })
  );
});
