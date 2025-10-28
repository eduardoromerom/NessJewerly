import { db, auth } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

/** Crea o actualiza un item con metadatos para sincronía y auditoría */
export async function upsertItem(id: string, payload: Record<string, any>) {
  await setDoc(doc(db, "items", id), {
    ...payload,
    updatedAt: serverTimestamp(),                 // clave para ordenar y detectar cambios
    updatedBy: auth.currentUser?.uid ?? "anon",   // quién tocó el doc
  }, { merge: true });
  return id;
}

/** Crea un item nuevo con ID aleatorio (usa crypto.randomUUID si existe) */
export async function addItem(payload: Record<string, any>) {
  const id = (globalThis.crypto?.randomUUID?.() ?? `it_${Date.now()}`);
  await upsertItem(id, payload);
  return id;
}

// Helper de depuración desde la consola del navegador:
if (typeof window !== "undefined") {
  (window as any).__addItem = addItem;
  (window as any).__upsertItem = upsertItem;
  console.log("[items-api] helpers disponibles: __addItem({...}), __upsertItem(id,{...})");
}
