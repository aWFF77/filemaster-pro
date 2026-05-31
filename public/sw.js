// FileMaster Pro Service Worker — 离线缓存
const CACHE = 'filemaster-v1'

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([
      './',
      './assets/index-' + (self.registration?.scope || '') + '.js',
    ])).catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request))
  )
})
