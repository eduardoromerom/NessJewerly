import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

// 🔒 Config FIJA de tu proyecto (no usa import.meta.env)
const firebaseConfig = {
  apiKey: "AIzaSyA8or2Uv80v1DQ2UzA0yuIIvxScctxJvPg",
  authDomain: "ness-e6877.firebaseapp.com",
  projectId: "ness-e6877",
  storageBucket: "ness-e6877.appspot.com",
  messagingSenderId: "94128190545",
  appId: "1:94128190545:web:6dc48d82b7682da7c3b470",
  measurementId: "G-RM23K8HBEY"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Analytics solo si es compatible
export let analytics: ReturnType<typeof getAnalytics> | undefined;
if (typeof window !== "undefined") {
  isSupported().then(ok => { if (ok) analytics = getAnalytics(app); });
}
