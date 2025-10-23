import { auth } from "./firebase";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";

(async () => {
  try {
    console.log("AUTH DEBUG → project:", import.meta.env.VITE_FIREBASE_PROJECT_ID, "origin:", window.location.origin);

    console.log("AUTH DEBUG → currentUser (antes):", auth.currentUser?.uid ?? null);
    onAuthStateChanged(auth, (u) => {
      console.log("AUTH DEBUG → onAuthStateChanged uid:", u?.uid ?? null);
    });

    const cred = await signInAnonymously(auth);
    console.log("AUTH DEBUG → signInAnonymously OK uid:", cred.user.uid);
  } catch (e: any) {
    console.error("AUTH DEBUG → signInAnonymously ERROR:", e.code, e.message, e);
  }
})();
