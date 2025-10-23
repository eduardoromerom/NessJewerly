if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then(regs => Promise.all(regs.map(r => r.unregister())))
    .then(() => console.log('[SW-KILL] service workers unregistered'));
}
if ('caches' in window) {
  caches.keys()
    .then(keys => Promise.all(keys.map(k => caches.delete(k))))
    .then(() => console.log('[SW-KILL] caches cleared'));
}
// recarga una vez para coger el bundle nuevo
setTimeout(() => location.reload(), 500);
export {};
