// FileMaster Pro — PWA Service Worker
const CACHE = 'filemaster-v1'

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([
      './',
      './index.html',
      './manifest.json',
      './icon-192.png',
      './icon-512.png',
    ]).catch(() => {}))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached
      return fetch(e.request).then((r) => {
        if (r.status === 200 && e.request.url.startsWith(self.location.origin)) {
          const clone = r.clone()
          caches.open(CACHE).then((c) => c.put(e.request, clone))
        }
        return r
      })
    })
  )
})
