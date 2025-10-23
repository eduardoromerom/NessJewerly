import { registerSW } from "virtual:pwa-register";

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Hay build nuevo → actívalo y recarga una sola vez
    updateSW(true);
  },
  onOfflineReady() {
    console.log("[PWA] listo para offline");
  },
  onRegisteredSW(_url, reg) {
    if (reg) setInterval(() => reg.update(), 60 * 60 * 1000);
  }
});
