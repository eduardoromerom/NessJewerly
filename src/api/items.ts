import { db, auth } from "../firebase";
import {
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment,
  getDoc,
} from "firebase/firestore";

/**
 * Crea o actualiza un item
 * 🔑 El ID del documento SIEMPRE es el SKU
 */
export async function upsertItem(
  sku: string,
  payload: {
    sku?: string;
    name?: string;
    quantity?: number;
  }
) {
  await setDoc(
    doc(db, "items", sku),
    {
      ...payload,
      sku,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.uid ?? "anon",
    },
    { merge: true }
  );

  return sku;
}

/**
 * Alta de producto (usar SOLO para crear items nuevos)
 */
export async function addItem(payload: {
  sku: string;
  name: string;
  quantity?: number;
}) {
  const sku = payload.sku;

  await upsertItem(sku, {
    sku,
    name: payload.name,
    quantity: payload.quantity ?? 0,
  });

  return sku;
}

/**
 * Ajuste de inventario
 * ✅ Seguro en múltiples dispositivos
 * ✅ Crea el item si no existe
 * ✅ Ideal para scanners
 */
export async function adjustStock(sku: string, delta: number) {
  const ref = doc(db, "items", sku);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      sku,
      quantity: delta,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.uid ?? "anon",
    });
  } else {
    await updateDoc(ref, {
      quantity: increment(delta),
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.uid ?? "anon",
    });
  }
}

/**
 * Helpers expuestos SOLO para pruebas desde consola
 */
if (typeof window !== "undefined") {
  (window as any).__addItem = addItem;
  (window as any).__upsertItem = upsertItem;
  (window as any).__adjustStock = adjustStock;

  console.log(
    "[items-api] helpers disponibles:",
    "__addItem({ sku, name, quantity? })",
    "__adjustStock(sku, delta)"
  );
}
