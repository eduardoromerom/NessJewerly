import { authReady } from "./auth-init";
import { db } from "./firebase";
import {
  collection, query, orderBy, limit, onSnapshot,
  doc, setDoc, serverTimestamp
} from "firebase/firestore";

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
