import { auth } from "./firebase";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";

export const authReady = new Promise<string>((resolve, reject) => {
  if (auth.currentUser?.uid) return resolve(auth.currentUser.uid);
  const off = onAuthStateChanged(auth, async (u) => {
    try {
      if (u?.uid) { off(); return resolve(u.uid); }
      const cred = await signInAnonymously(auth);
      off();
      resolve(cred.user.uid);
    } catch (e) { reject(e); }
  });
});

console.log("Auth init: esperando sesión anónima…");
authReady.then(uid => console.log("Auth init OK uid:", uid))
        .catch(e => console.error("Auth init error:", e));
