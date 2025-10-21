import { auth, db, storage } from "./firebase";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

async function ensureAnon() {
  if (!auth.currentUser) await signInAnonymously(auth);
}

async function env() {
  const e = {
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    bucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
  console.log("ENV:", e);
  return e;
}

async function whoami() {
  return new Promise<string | null>((resolve) => {
    onAuthStateChanged(auth, (u) => {
      console.log("Auth user:", u?.uid || null);
      resolve(u?.uid || null);
    });
  });
}

async function pingFirestore() {
  await ensureAnon();
  const r = doc(db, "__diag", "ping");
  await setDoc(r, { ts: serverTimestamp() }, { merge: true });
  const snap = await getDoc(r);
  console.log("Firestore OK:", snap.exists(), snap.data());
  return snap.data();
}

async function pingStorage() {
  await ensureAnon();
  const r = ref(storage, "__diag/ping.txt");
  const data = new Blob([`pong ${Date.now()}`], { type: "text/plain" });
  await uploadBytes(r, data);
  const url = await getDownloadURL(r);
  console.log("Storage OK URL:", url);
  return url;
}

// Exponer helpers en window para usarlos desde la consola:
(window as any).firebaseDiag = { env, whoami, pingFirestore, pingStorage };
console.log("firebaseDiag listo → usa window.firebaseDiag.* desde la consola");
