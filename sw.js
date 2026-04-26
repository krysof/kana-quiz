const CACHE_VERSION = '2026-04-26.1';
const CACHE_NAME = `gojuon-${CACHE_VERSION}`;

// App shell - precached on install
const PRECACHE_URLS = [
  './',
  'index.html',
  'pwa/manifest.json',
  'pwa/icons/icon-192.png',
  'pwa/icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('gojuon-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Network-first for navigation (HTML) and JS/CSS/JSON.
// Falls back to cache only if network fails (offline).
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  if (!isSameOrigin) return;

  // Navigation requests (HTML page loads) - always try network first
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((resp) => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          return resp;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // JS/CSS/JSON - network-first to get updates immediately
  const isDynamic = /\.(js|css|json)(\?|$)/i.test(url.pathname + url.search);
  if (isDynamic) {
    e.respondWith(
      fetch(req)
        .then((resp) => {
          if (resp && resp.status === 200 && resp.type === 'basic') {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          }
          return resp;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Static assets (images, fonts) - cache-first
  e.respondWith(
    caches.match(req).then((cached) => {
      return cached || fetch(req).then((resp) => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
        }
        return resp;
      });
    })
  );
});

// Allow page to trigger skipWaiting
self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
