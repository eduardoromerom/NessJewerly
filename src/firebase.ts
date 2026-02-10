// src/firebase.ts (o firebase-init.ts)
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyA8or2Uv80v1DQ2UzA0yuIIvxScctxJvPg",          // ← aquí va tu apiKey REAL
  authDomain: "ness-e6877.firebaseapp.com",
  projectId: "ness-e6877",
  storageBucket: "ness-e6877.appspot.com",
  messagingSenderId: "94128190545",
  appId: "1:94128190545:web:6dc48d82b7682da7c3b470"
}

// Inicialización singleton
const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)