// src/live-bridge.ts (encabezado definitivo)
import {
  collection,
  doc,
  onSnapshot,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db, authReady } from "./firebase"; // ⬅️ usamos el db central


(async () => {
  await authReady;

  // Listener en tiempo real (solo logs)
  const q = query(collection(db, "items"), orderBy("updatedAt","desc"), limit(20));
  onSnapshot(q, (snap) => {
    console.log("[LIVE items]", snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, (err) => console.error("[LIVE items] error:", err));

  // Botón para escribir un doc de prueba desde la consola
  (globalThis as any).__pingItem = async () => {
    await setDoc(doc(db, "items", "__ping"), {
      ts: serverTimestamp(),
      updatedAt: serverTimestamp(),
      host: typeof window !== "undefined" ? window.location.host : "ssr"
    }, { merge: true });
    console.log("(__pingItem) escrito items/__ping");
  };
})();

// --- live bridge: stream de items esperando auth ---
export async function startLiveItems(onChange: (rows: any[]) => void) {
  // Espera a que Auth determine el usuario actual (evita condiciones de carrera)
  await authReady;

  const q = query(
    collection(db, "items"),
    orderBy("createdAt", "desc"),
    limit(50)
  );

  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    onChange(rows);
  });
}
