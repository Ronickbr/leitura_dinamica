const CACHE_NAME = 'fluencia-public-v2';
const STATIC_ASSETS = ['/offline.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(names
    .filter(name => name !== CACHE_NAME && (name.startsWith('fluencia-') || name.startsWith('fluencia-leitora-')))
    .map(name => caches.delete(name)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin ||
      event.request.headers.has('authorization')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(async () =>
      await caches.match('/offline.html') || new Response('Sem conexão', { status: 503 })));
    return;
  }
  if (!STATIC_ASSETS.includes(url.pathname) || url.search) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
