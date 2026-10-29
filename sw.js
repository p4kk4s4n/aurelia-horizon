const CACHE_NAME = 'p4kk4s4n-aurelia-horizon-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.webmanifest',
  './icon.svg',
  './src/main.js',
  './src/input.js',
  './src/world/noise.js',
  './src/world/cubeSphere.js',
  './src/world/gravity.js',
  './src/world/decor.js',
  './src/world/body.js',
  './src/world/sky.js',
  './src/player/explorer.js',
  './src/player/cameraRig.js',
  './src/ship/repair.js',
  './src/ship/ship.js',
  './src/ui/hud.js',
  './vendor/three/three.module.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
