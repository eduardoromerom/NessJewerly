// SW destructor definitivo
self.addEventListener('install', (e) => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      // tomar control
      await self.clients.claim();
      // borrar TODAS las caches
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    } catch (e) {}

    // desregistrar este SW
    try { await self.registration.unregister(); } catch (e) {}

    // recargar todas las ventanas una ÚNICA vez para tomar el bundle nuevo
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of clients) { c.navigate(c.url); }
  })());
});

// no interceptar nada
self.addEventListener('fetch', () => {});
