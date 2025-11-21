import { authReady } from "./auth-init";
import { db } from "./firebase";
import {
  collection, query, orderBy, limit, onSnapshot,
  doc, setDoc, serverTimestamp
} from "firebase/firestore";

(async () => {
  await authReady;

  const q = query(collection(db, "items"), orderBy("updatedAt","desc"), limit(20));
  onSnapshot(q,
    (snap) => console.log("[LIVE items]", snap.docs.map(d => ({ id:d.id, ...d.data() }))),
    (err)  => console.error("[LIVE items] error:", err)
  );

  (globalThis as any).__pingItem = async () => {
    await setDoc(doc(db, "items", "__ping"), {
      ts: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge:true });
    console.log("(__pingItem) escrito items/__ping");
  };
})();
