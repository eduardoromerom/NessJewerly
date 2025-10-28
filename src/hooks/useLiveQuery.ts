import { useEffect, useMemo, useState } from "react";
import {
  collection, query, where, orderBy, limit as qlimit,
  onSnapshot, DocumentData, QueryConstraint, Unsubscribe, WhereFilterOp
} from "firebase/firestore";
import { db } from "../firebase";        // ajusta si tu firebase está en otra ruta
import { authReady } from "../auth-init"; // espera login anónimo antes de escuchar

export type Filter = [field: string, op: WhereFilterOp, value: any];
export type Order  = [field: string, dir: "asc" | "desc"];

export function useLiveQuery(
  path: string,
  opts?: { filters?: Filter[]; orderBy?: Order[]; limit?: number }
) {
  const { filters = [], orderBy: orders = [], limit } = opts || {};
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<unknown>(null);

  const qref = useMemo(() => {
    const base = collection(db, path);
    const parts: QueryConstraint[] = [];
    for (const [f, op, v] of filters) parts.push(where(f, op, v));
    for (const [f, dir]  of orders)  parts.push(orderBy(f, dir));
    if (limit) parts.push(qlimit(limit));
    return query(base, ...parts);
  }, [path, JSON.stringify(filters), JSON.stringify(orders), limit]);

  useEffect(() => {
    let unsub: Unsubscribe | undefined;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        await authReady; // reglas de Firestore suelen requerir auth
        if (cancelled) return;
        unsub = onSnapshot(
          qref,
          (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as DocumentData) }));
            setRows(data);
            setLoading(false);
          },
          (err) => { setError(err); setLoading(false); }
        );
      } catch (e) {
        setError(e);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; unsub?.(); };
  }, [qref]);

  return { rows, loading, error };
}
