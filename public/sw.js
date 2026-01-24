const CACHE_NAME = 'lufit-v2';
const ASSETS = [
    './',
    './index.html',
    './favicon.png',
    './app-icon.png',
    './LuFit nombre solo.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS).catch(err => console.log('Asset cache error:', err));
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Only handle GET requests and avoid local data/db URLs
    if (event.request.method !== 'GET') return;
    if (event.request.url.includes('turso.io')) return;

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
