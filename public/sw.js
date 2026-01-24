const CACHE_NAME = 'lufit-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/favicon.png',
    '/app-icon.png',
    '/LuFit nombre solo.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Ignore errors for non-essential assets
            return cache.addAll(ASSETS).catch(err => console.log('Asset cache error:', err));
        })
    );
});

self.addEventListener('fetch', (event) => {
    // ONLY intercept GET requests. POST/PUT/DELETE for DB must go directly to network.
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
