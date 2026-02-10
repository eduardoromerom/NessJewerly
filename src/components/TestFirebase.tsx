import { useEffect, useState } from 'react';
import { auth, db } from '../firebase'; // Ajusta la ruta si firebase.ts está en otro lugar
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, limit } from 'firebase/firestore';

export default function TestFirebase() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 1. Verificar si hay usuario logueado
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log(
        'Usuario actual →',
        currentUser ? currentUser.uid + ' (' + currentUser.email + ')' : 'NADIE logueado'
      );
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe(); // Limpieza importante
  }, []);

  // 2. Intentar leer datos de Firestore (cambia 'items' por tu colección real)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const q = query(collection(db, 'items'), limit(5)); // ← Cambia 'items' por el nombre real de tu colección
        const snapshot = await getDocs(q);

        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setDocs(data);
        console.log('Datos leídos de Firestore:', data);
      } catch (err: any) {
        console.error('Error Firestore:', err);
        setError(err.message || 'No se pudo leer la colección');
      }
    };

    if (!loading) {
      fetchData();
    }
  }, [loading]);

  if (loading) return <div style={{ padding: '20px' }}>Conectando a Firebase...</div>;

  return (
    <div
      style={{
        padding: '20px',
        margin: '20px',
        border: '2px solid #4CAF50',
        borderRadius: '8px',
        background: '#f8fff8',
        maxWidth: '600px',
      }}
    >
      <h2>🧪 Prueba rápida de Firebase</h2>

      <h3>Autenticación:</h3>
      {user ? (
        <p style={{ color: 'green', fontWeight: 'bold' }}>
          ✅ Conectado como: {user.email}
          <br />
          UID: {user.uid}
        </p>
      ) : (
        <p style={{ color: 'red', fontWeight: 'bold' }}>❌ No hay usuario autenticado</p>
      )}

      <h3>Datos de Firestore (primeros 5 documentos):</h3>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {docs.length > 0 ? (
        <pre
          style={{
            background: '#eee',
            padding: '12px',
            borderRadius: '6px',
            overflowX: 'auto',
            fontSize: '0.9em',
          }}
        >
          {JSON.stringify(docs, null, 2)}
        </pre>
      ) : (
        <p>
          No hay datos o no tienes permiso / la colección está vacía
          <br />
          <small>(revisa reglas de Firestore y nombre de colección)</small>
        </p>
      )}

      <small style={{ color: '#666' }}>
        Abre la consola del navegador (F12) para ver logs más detallados
      </small>
    </div>
  );
}