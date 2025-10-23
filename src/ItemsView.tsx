import React from "react";
import { useLiveQuery } from "./hooks/useLiveQuery";

export default function ItemsView(){
  const { rows, loading, error } = useLiveQuery("items", {
    orderBy: [["updatedAt","desc"]],
    limit: 100
  });

  if (loading) return <p>Cargando…</p>;
  if (error)   return <p style={{color:"crimson"}}>Error: {String((error as any)?.message || error)}</p>;

  return (
    <ul>
      {rows.map(r => (
        <li key={r.id}>
          <strong>{r.nombre ?? "(sin nombre)"}</strong>
          {" — stock: "}{r.stock ?? "-"}
        </li>
      ))}
    </ul>
  );
}
