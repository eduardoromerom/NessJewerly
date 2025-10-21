import { auth, db } from "./firebase";
import { signInAnonymously } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

(async () => {
  try {
    // 1) Auth anónimo (asegúrate de habilitarlo en Firebase > Auth > Sign-in method)
    const cred = await signInAnonymously(auth);

    // 2) Escribe un doc de prueba
    const ref = doc(db, "__diag", "site");
    await setDoc(ref, { ts: serverTimestamp(), host: window.location.host, uid: cred.user.uid }, { merge: true });

    // 3) Léelo de vuelta
    const snap = await getDoc(ref);

    console.log("FIREBASE OK →",
      {
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        uid: cred.user.uid,
        data: snap.exists() ? snap.data() : null
      }
    );
  } catch (e) {
    console.error("FIREBASE ERROR →", e);
  }
})();
