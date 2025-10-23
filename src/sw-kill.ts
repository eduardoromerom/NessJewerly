const KEY = "swkill_v2";
(async () => {
  try {
    if (localStorage.getItem(KEY)) return; // solo una vez
    localStorage.setItem(KEY, "1");

    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
      console.log("[SW-KILL] unregistered");
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      console.log("[SW-KILL] caches cleared");
    }
    setTimeout(() => location.reload(), 300); // recarga una vez
  } catch (e) { console.warn("[SW-KILL] error", e); }
})();
export {};
