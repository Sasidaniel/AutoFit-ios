// service-worker.js — app shell caching for offline + installability
const CACHE_NAME = 'autofit-v42';
const PRECACHE_URLS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './js/seed.js',
  './js/timer.js',
  './js/native-bridge.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './images/p2_1.png', './images/p2_2.png', './images/p2_3.png', './images/p2_4.png',
  './images/p3_1.png', './images/p3_2.png', './images/p3_3.png',
  './images/p4_1.png', './images/p4_2.png', './images/p4_3.png',
  './images/p5_1.png', './images/p5_2.png', './images/p5_3.png', './images/p5_4.png',
  './images/p6_1.png', './images/p6_2.png',
  './images/p7_1.png', './images/p7_2.png', './images/p7_3.png',
  './images/p8_1.png', './images/p8_2.png', './images/p8_3.png',
  './images/ex_plank.png', './images/ex_shrugs.png', './images/ex_hammer.png',
  './vendor/chart.umd.min.js',
  './vendor/jspdf.umd.min.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith('autofit-') && k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const isAppShell = event.request.mode === 'navigate' ||
    (url.origin === self.location.origin && /\.(html|js|css|json)$/.test(url.pathname));

  if (isAppShell) {
    // Network-first for the app shell (HTML/JS/CSS) so code/UI updates are picked
    // up on the very next load instead of only after a background refresh.
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(async () => (await caches.match(event.request))
          || (event.request.mode === 'navigate' ? await caches.match('./index.html') : null)
          || Response.error())
    );
    return;
  }

  // Stale-while-revalidate for images/fonts/CDN assets: instant load from cache,
  // refreshed in the background for next time (good for offline + large images).
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
