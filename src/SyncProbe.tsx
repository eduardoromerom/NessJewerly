import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { authReady } from "./auth-init";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";

export default function SyncProbe() {
  const [data, setData] = useState<any>(null);
  const [uid, setUid] = useState<string>("(login...)");
  const ref = doc(db, "__sync", "probe");

  useEffect(() => {
    let off = () => {};
    (async () => {
      const u = await authReady; setUid(u);
      off = onSnapshot(ref, (snap) => setData(snap.data() || null));
    })();
    return () => off();
  }, []);

  async function ping() {
    await setDoc(ref, {
      ts: serverTimestamp(),
      host: window.location.host,
      rand: Math.random().toString(36).slice(2,8)
    }, { merge: true });
  }

  return (
    <div style={{padding:12, background:"#f6f6f7", borderRadius:8, margin:"12px 0", fontFamily:"system-ui"}}>
      <b>SyncProbe</b> — uid: <code>{uid}</code>
      <div style={{marginTop:8}}>
        <button onClick={ping}>Ping (escribir)</button>
      </div>
      <div style={{marginTop:8}}>
        <b>Doc __sync/probe:</b> <code>{data ? JSON.stringify(data) : "(sin datos)"}</code>
      </div>
      <div style={{color:"#666", marginTop:6}}>Ábrelo en 2 navegadores y pulsa “Ping” en uno: el otro debe actualizarse al instante.</div>
    </div>
  );
}
