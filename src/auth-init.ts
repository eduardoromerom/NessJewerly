// src/auth-init.ts
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";

onAuthStateChanged(auth, async (user) => {
  try {
    if (!user) {
      await signInAnonymously(auth);
    }
    const u = auth.currentUser;
    if (u) {
      console.log("[AUTH OK] –", u.uid);
      await setDoc(
        doc(db, "__diag", "auth"),
        {
          uid: u.uid,
          when: serverTimestamp(),
          where: typeof window !== "undefined" ? window.location.host : "server",
        },
        { merge: true }
      );
      console.log("[AUTH PING] escrito __diag/auth");
    }
  } catch (e) {
    console.error("[AUTH ERROR]", e);
  }
});
