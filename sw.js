const CACHE_NAME = 'p4kk4s4n-aurelia-horizon-v7';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.webmanifest',
  './version.json',
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
  './src/ui/settings.js',
  './src/ui/touchControls.js',
  './vendor/three/three.module.js'
];

async function recacheAllAssets() {
  const keys = await caches.keys();
  await Promise.all(keys.map((k) => caches.delete(k)));
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(
    ASSETS.map(async (url) => {
      const req = new Request(url, { cache: 'reload' });
      const resp = await fetch(req);
      if (resp.ok) {
        await cache.put(url, resp);
      }
    })
  );
}

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

self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'RECACHE_ALL') {
    event.waitUntil(
      recacheAllAssets().then(() => {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ ok: true });
        }
      }).catch((err) => {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ ok: false, error: String(err) });
        }
      })
    );
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Always use network-first for version.json or GitHub API checks
  if (url.pathname.endsWith('/version.json') || url.hostname === 'api.github.com' || url.hostname === 'raw.githubusercontent.com') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => caches.match(event.request))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
