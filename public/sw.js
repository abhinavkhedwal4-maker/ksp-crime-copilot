// KSP Crime Copilot — Service Worker
// Caches static assets for offline-first field use

const CACHE_NAME = 'ksp-copilot-v1';
const STATIC_ASSETS = [
  '/login.html',
  '/dashboard.html',
  '/chat.html',
  '/map.html',
  '/network.html',
  '/css/style.css',
  '/js/auth.js',
  '/js/chat.js',
  '/js/dashboard.js',
  '/js/firebase-config.js',
  '/js/map.js',
  '/js/network.js',
  '/js/router.js',
  '/manifest.json'
];

// Install: pre-cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Pre-cache partial failure (some external CDN assets may fail):', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API calls — always network (never cache)
  if (url.pathname.startsWith('/api/')) {
    return; // fall through to network
  }

  // External CDN (Firebase, Leaflet, Chart.js etc.) — network first, fallback cache
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(event.request)
        .then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return resp;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Own static assets — cache first, fallback network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return resp;
      });
    })
  );
});
