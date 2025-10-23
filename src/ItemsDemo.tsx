import React, { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase";
import { useItemsLive } from "@/hooks/useItemsLive";

export default function ItemsDemo() {
  const { items, loading, error } = useItemsLive({
    orderBy: [["nombre", "asc"]],
    limit: 50,
  });
  const [nombre, setNombre] = useState("");
  const [sku, setSku] = useState("");

  async function addItem() {
    if (!nombre.trim()) return;
    await addDoc(collection(db, "items"), {
      nombre,
      sku: sku || null,
      stock: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setNombre("");
    setSku("");
  }

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h1>Items (LIVE)</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input placeholder="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <input placeholder="sku" value={sku} onChange={(e) => setSku(e.target.value)} />
        <button onClick={addItem}>Agregar</button>
      </div>

      {loading && <p>Cargando…</p>}
      {error && <p style={{ color: "crimson" }}>Error: {String((error as any)?.message || error)}</p>}

      <ul>
        {items.map((it) => (
          <li key={it.id}>
            <strong>{it.nombre || "(sin nombre)"}</strong>
            {it.sku ? ` — SKU: ${it.sku}` : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
