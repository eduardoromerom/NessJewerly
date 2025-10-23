const KEY = "swkill_v1";

(async () => {
  try {
    // Si ya se ejecutó una vez, no volver a hacerlo (evita loop)
    if (localStorage.getItem(KEY)) {
      console.log("[SW-KILL] already done, skipping");
      return;
    }
    localStorage.setItem(KEY, "1");

    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
      console.log("[SW-KILL] service workers unregistered");
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      console.log("[SW-KILL] caches cleared");
    }

    // recarga una ÚNICA vez para tomar el bundle nuevo
    setTimeout(() => location.reload(), 300);
  } catch (e) {
    console.warn("[SW-KILL] error", e);
  }
})();
export {};
