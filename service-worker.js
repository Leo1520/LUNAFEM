/**
 * LunaFem - Service Worker
 * Estrategia de caché segura y actualizada para GitHub Pages y navegación offline
 */

const CACHE_NAME = 'lunafem-cache-v1.0.1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/styles.css',
  './js/storage.js',
  './js/cycle.js',
  './js/calendar.js',
  './js/statistics.js',
  './js/app.js',
  './assets/icon.svg',
  './manifest.json'
];

// Instalación: pre-cachear recursos críticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activación: limpiar cachés antiguas para evitar bloqueos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Eliminando caché antigua:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network First con fallback a Cache para recursos locales
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Solo interceptar peticiones GET dentro del mismo origen o CDNs críticos
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Si la red responde bien, guardamos copia en caché y retornamos
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Si no hay red (offline), servimos desde la caché
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          // Fallback general para navegación
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
