// src/firebase.ts
import { initializeApp } from "firebase/app";
import { initializeFirestore /*, setLogLevel */ } from "firebase/firestore";
import {
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ness-e6877.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ness-e6877",
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  // Opcionales:
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ness-e6877.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const app = initializeApp(firebaseConfig);

// AUTH
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
});

// Promise que se resuelve cuando Auth ya conoce el estado del usuario
export const authReady: Promise<void> = new Promise((resolve) => {
  const unsub = onAuthStateChanged(auth, () => {
    unsub();
    resolve();
  });
});

// FIRESTORE con transporte moderno (evita Listen/channel 400)
export const db = initializeFirestore(app, {
  useFetchStreams: true,
  experimentalAutoDetectLongPolling: true,
});

// setLogLevel("debug"); // <- opcional para depurar
