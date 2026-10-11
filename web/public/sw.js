// Offline support for the wipe guides: hashed assets are cached on first use, data files are
// network-first with a cached fallback, and navigations fall back to the cached app shell.
const cacheName = 'safedrop-v1'
const precache = ['/', '/data/guides.json', '/config.json', '/favicon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(precache)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== cacheName).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

function networkFirst(request, fallbackKey) {
  return fetch(request)
    .then((response) => {
      if (response.ok) {
        const copy = response.clone()
        caches.open(cacheName).then((cache) => cache.put(fallbackKey ?? request, copy))
      }
      return response
    })
    .catch(() => caches.match(fallbackKey ?? request))
}

function cacheFirst(request) {
  return caches.match(request).then(
    (hit) =>
      hit ??
      fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(cacheName).then((cache) => cache.put(request, copy))
        }
        return response
      }),
  )
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return
  if (event.request.mode === 'navigate') event.respondWith(networkFirst(event.request, '/'))
  else if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/images/') || url.pathname.startsWith('/fonts/')) event.respondWith(cacheFirst(event.request))
  else if (url.pathname.startsWith('/data/') || url.pathname === '/config.json') event.respondWith(networkFirst(event.request))
})
