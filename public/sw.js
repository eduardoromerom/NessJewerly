// SW destructor: toma control, borra caches y se desregistra
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try { await self.clients.claim(); } catch(e){}
    try { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } catch(e){}
    try { await self.registration.unregister(); } catch(e){}
    const cs = await self.clients.matchAll({ type:'window', includeUncontrolled:true });
    for (const c of cs) c.navigate(c.url);
  })());
});
self.addEventListener('fetch', () => {});
