import { db, auth } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export async function upsertItem(id: string, payload: Record<string, any>) {
  await setDoc(doc(db, "items", id), {
    ...payload,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid ?? "anon",
  }, { merge: true });
  return id;
}
export async function addItem(payload: Record<string, any>) {
  const id = (globalThis.crypto?.randomUUID?.() ?? `it_${Date.now()}`);
  await upsertItem(id, payload);
  return id;
}
if (typeof window !== "undefined") {
  (window as any).__addItem = addItem;
  (window as any).__upsertItem = upsertItem;
  console.log("[items-api] helpers disponibles: __addItem({...}), __upsertItem(id,{...})");
}
