import { useEffect, useMemo, useState } from "react";
import {
  collection, query as q, onSnapshot,
  where, orderBy as ob, limit as lmt,
  WhereFilterOp, DocumentData
} from "firebase/firestore";
import { db } from "@/firebase";

/** Modelo mínimo de Item. Ajusta campos a tu esquema real. */
export type Item = {
  id: string;
  sku?: string;
  nombre?: string;
  precio?: number;
  stock?: number;
  [k: string]: any;
};

type Filter = [field: string, op: WhereFilterOp, value: any];
type Order = [field: string, dir: "asc" | "desc"];

export function useItemsLive(opts?: {
  filters?: Filter[];
  orderBy?: Order[];
  limit?: number;
}) {
  const { filters = [], orderBy = [], limit } = opts || {};
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const colRef = useMemo(() => collection(db, "items"), []);
  const liveQuery = useMemo(() => {
    const parts: any[] = [];
    for (const [f, op, v] of filters) parts.push(where(f, op, v));
    for (const [f, dir] of orderBy) parts.push(ob(f, dir));
    if (limit) parts.push(lmt(limit));
    return q(colRef, ...parts);
  }, [colRef, JSON.stringify(filters), JSON.stringify(orderBy), limit]);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      liveQuery,
      (snap) => {
        const rows: Item[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) }));
        setItems(rows);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [liveQuery]);

  return { items, loading, error };
}
