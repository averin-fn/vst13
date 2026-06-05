/* ВСТ13 — service worker.
   Сейчас: офлайн-фолбэк оболочки. На этапе 3b добавятся push/notificationclick. */
const CACHE = 'vst13-shell-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // чистим старые версии кэша
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Навигация: network-first, при офлайне — кэшированная оболочка.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(CACHE);
          cache.put('/', res.clone());
          return res;
        } catch {
          const cached = await caches.match('/');
          return cached || Response.error();
        }
      })()
    );
  }
  // Остальное (хешированные ассеты) — без кэша SW, чтобы не залипали старые версии.
});

/* ---- Push (этап 3b) ---- */
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'ВСТ13', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'ВСТ13';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'vst13-chat',
    data: { url: data.url || '/cabinet/chat' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/cabinet/chat';
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of all) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return null;
    })()
  );
});
