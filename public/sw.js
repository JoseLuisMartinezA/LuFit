self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET' || e.request.url.includes('turso.io')) return;
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
