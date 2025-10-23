import { auth, db } from "./firebase";
import { signInAnonymously } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

async function healthcheck() {
  try {
    await signInAnonymously(auth);
    const ref = doc(db, "healthcheck", "ping");
    await setDoc(ref, { ts: Date.now() }, { merge: true });
    const snap = await getDoc(ref);
    console.log("FB OK project:", import.meta.env.VITE_FIREBASE_PROJECT_ID, "doc:", snap.data());
  } catch (e) {
    console.error("Healthcheck error:", e);
  }
}
healthcheck();
