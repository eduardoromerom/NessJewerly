import React from "react";
import { useLiveQuery } from "../hooks/useLiveQuery";

export default function InventoryView() {
  const { rows, loading, error } = useLiveQuery("items", {
    orderBy: [["updatedAt", "desc"]],
    limit: 200,
  });

  if (error) return <p style={{color:"crimson"}}>Error: {String((error as any)?.message || error)}</p>;

  return (
    <section className="inv">
      <h2 className="title">Inventario</h2>
      {loading ? (
        <div className="skeleton">Cargando…</div>
      ) : rows.length === 0 ? (
        <p>Sin items todavía.</p>
      ) : (
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>SKU</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>updatedAt</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.nombre ?? "—"}</td>
                  <td>{r.sku ?? "—"}</td>
                  <td>{r.precio ?? "—"}</td>
                  <td>{r.stock ?? "—"}</td>
                  <td>{r.updatedAt?.toDate ? r.updatedAt.toDate().toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
