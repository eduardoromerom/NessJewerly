import { auth, db } from "./firebase";
import { signInAnonymously } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

(async () => {
  try {
    const cred = await signInAnonymously(auth);
    const ref = doc(db, "__diag", "site");
    await setDoc(ref, { ts: serverTimestamp(), host: window.location.host, uid: cred.user.uid }, { merge: true });
    const snap = await getDoc(ref);
    console.log("FIREBASE OK →", {
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      uid: cred.user.uid,
      data: snap.exists() ? snap.data() : null
    });
  } catch (e) { console.error("FIREBASE ERROR →", e); }
})();
