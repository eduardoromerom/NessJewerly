import React, { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from "firebase/firestore";

export default function DebugPanel() {
  const [uid, setUid] = useState<string | null>(null);
  const [authErr, setAuthErr] = useState<string | null>(null);
  const [ping, setPing] = useState<any>(null);
  const [live, setLive] = useState<any>(null);
  const [subscribed, setSubscribed] = useState(false);

  // Arranque: intenta sesión anónima
  useEffect(() => {
    const off = onAuthStateChanged(auth, async (u) => {
      try {
        if (u?.uid) { setUid(u.uid); return; }
        const cred = await signInAnonymously(auth);
        setUid(cred.user.uid);
      } catch (e: any) {
        setAuthErr(`${e.code || "error"}: ${e.message || e}`);
      }
    });
    return () => off();
  }, []);

  // Botón: escribir y leer doc de prueba
  async function pingFirestore() {
    try {
      const ref = doc(db, "__diag", "panel");
      await setDoc(ref, { ts: serverTimestamp(), host: window.location.host }, { merge: true });
      const snap = await getDoc(ref);
      setPing(snap.data());
    } catch (e: any) { setAuthErr(`${e.code || "error"}: ${e.message || e}`); }
  }

  // Botón: suscribirse en vivo
  function subscribeLive() {
    if (subscribed) return;
    const ref = doc(db, "__diag", "panel");
    const off = onSnapshot(ref, (s) => setLive(s.data()));
    setSubscribed(true);
    // escribe cada 5s para que veas cambios en dos navegadores
    const it = setInterval(() => setDoc(ref, { beat: Date.now() }, { merge: true }), 5000);
    // @ts-ignore
    window.__offLive = () => { off(); clearInterval(it); setSubscribed(false); };
  }

  // Botón: limpiar SW/caché
  async function resetCache() {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    location.reload();
  }

  return (
    <div style={{fontFamily:"system-ui, sans-serif", padding:16, lineHeight:1.5, maxWidth:760, margin:"20px auto"}}>
      <h1>Diagnóstico Firebase</h1>
      <p><b>Proyecto:</b> {import.meta.env.VITE_FIREBASE_PROJECT_ID || "(sin env)"} </p>
      <p><b>Origen:</b> {window.location.origin}</p>
      <p><b>UID anónimo:</b> {uid ?? "(pendiente)"} {authErr ? <span style={{color:"crimson"}}> — {authErr}</span> : null}</p>

      <d


# App que solo renderiza el panel
cat > src/App.tsx <<'EOF'
import React from "react";
import DebugPanel from "./DebugPanel";
export default function App(){ return <DebugPanel/>; }
