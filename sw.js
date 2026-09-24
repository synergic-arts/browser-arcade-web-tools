const CACHE = 'browser-arcade-v2';
const ASSETS = [
  './', './index.html', './styles.css', './manifest.webmanifest',
  './juegos/meteor-patrol/', './juegos/meteor-patrol/index.html', './juegos/meteor-patrol/styles.css', './juegos/meteor-patrol/app.js',
  './juegos/hex-path/', './juegos/hex-path/index.html', './juegos/hex-path/styles.css', './juegos/hex-path/app.js',
  './juegos/memory-layers/', './juegos/memory-layers/index.html', './juegos/memory-layers/styles.css', './juegos/memory-layers/app.js',
  './juegos/nebula-command/', './juegos/nebula-command/index.html', './juegos/nebula-command/styles.css', './juegos/nebula-command/app.js',
  './juegos/cartographer-quest/', './juegos/cartographer-quest/index.html', './juegos/cartographer-quest/styles.css', './juegos/cartographer-quest/app.js',
  './juegos/carto-tactics/', './juegos/carto-tactics/index.html', './juegos/carto-tactics/styles.css', './juegos/carto-tactics/app.js',
  './juegos/ridge-recon/', './juegos/ridge-recon/index.html', './juegos/ridge-recon/styles.css', './juegos/ridge-recon/app.js'
];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => { if (event.request.method === 'GET' && response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); } return response; }).catch(() => caches.match('./index.html')))));
