if (typeof window !== "undefined") {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
  }
  if ("caches" in window) {
    caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
  }
}
export {};
