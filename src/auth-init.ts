import { auth, db } from "./firebase";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

console.log("[auth-init] cargado");

export const authReady = new Promise<string>((resolve, reject) => {
  const done = (uid: string) => {
    console.log("[AUTH OK]", uid);
    resolve(uid);
    (async () => {
      try {
        await setDoc(doc(db, "__diag", "auth"), {
          ts: serverTimestamp(), uid,
          host: typeof window !== "undefined" ? window.location.host : "ssr",
          ua: typeof navigator !== "undefined" ? navigator.userAgent : "n/a",
        }, { merge: true });
        console.log("[AUTH PING] escrito __diag/auth");
      } catch (err) {
        console.error("[AUTH PING] fallo:", err);
      }
    })();
  };

  try {
    if (auth.currentUser?.uid) return done(auth.currentUser.uid);
    const off = onAuthStateChanged(auth, async (u) => {
      try {
        if (u?.uid) { off(); return done(u.uid); }
        const cred = await signInAnonymously(auth);
        off(); return done(cred.user.uid);
      } catch (e) { off(); console.error("[AUTH ERROR] signInAnonymously:", e); reject(e as any); }
    });
  } catch (e) { console.error("[AUTH ERROR] inesperado:", e); reject(e as any); }
});
