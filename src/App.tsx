import { useMemo, useState, useEffect } from 'react'
import './index.css'
import TestFirebase from './components/TestFirebase'
import {
  collection,
  getDocs,
  query,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'firebase/auth'
import { auth, db } from './firebase'
import * as XLSX from 'xlsx'

type Producto = {
  id: string
  sku: string
  nombre: string
  categoria: string
  precio: number
  stock: number
}

type Movimiento = {
  id: string
  productoId: string
  tipo: 'entrada' | 'salida'
  cantidad: number
  fecha: string
  nota?: string
}

type Tab = 'catalogo' | 'movimientos' | 'reportes' | 'config' | 'debug'

const K_ITEMS = 'inv.joyeria.items.v1'
const K_MOVS = 'inv.joyeria.movs.v1'

const seed: Producto[] = [
  { id: 'p-001', sku: 'ARO-PLATA-001', nombre: 'Anillo plata .925', categoria: 'Anillos', precio: 850, stock: 12 },
  { id: 'p-002', sku: 'CAD-ORO-002', nombre: 'Cadena oro 14k', categoria: 'Cadenas', precio: 5200, stock: 3 },
  { id: 'p-003', sku: 'ARE-ACERO-003', nombre: 'Aretes acero', categoria: 'Aretes', precio: 250, stock: 22 },
]

const ucFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const tabs = ['catalogo', 'movimientos', 'reportes', 'config', 'debug'] as const

export default function App() {
  const [user, setUser] = useState<any>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [tab, setTab] = useState<Tab>('catalogo') // Empieza en catálogo
  const [q, setQ] = useState('')
  const [items, setItems] = useState<Producto[]>(seed)
  const [draft, setDraft] = useState<Producto>({ id: '', sku: '', nombre: '', categoria: '', precio: 0, stock: 0 })
  const [mvDraft, setMvDraft] = useState<Movimiento>({
    id: '', productoId: '', tipo: 'entrada', cantidad: 1, fecha: new Date().toISOString(), nota: ''
  })
  const [movs, setMovs] = useState<Movimiento[]>([])

  // Listener de autenticación
  useEffect(() => {
    console.log("=== INICIANDO LISTENER DE AUTH ===")
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("onAuthStateChanged disparado")
      console.log("Usuario:", currentUser ? currentUser.uid : "NULL - NO hay usuario")
      if (currentUser) {
        console.log("Email:", currentUser.email)
      }
      setUser(currentUser)
      setLoadingAuth(false)
    }, (err) => {
      console.error("ERROR EN AUTH:", err)
      setLoadingAuth(false)
    })

    return () => unsubscribe()
  }, [])

  // Escucha en tiempo real de los items
  useEffect(() => {
    if (!user) return

    console.log("Usuario logueado → escuchando cambios en tiempo real...")

    const qRef = query(collection(db, 'items'))

    const unsubscribe = onSnapshot(qRef, (snapshot) => {
      const loaded = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          sku: data.sku || '',
          nombre: data.nombre || '',
          categoria: data.categoria || '',
          precio: Number(data.precio) || 0,
          stock: Number(data.stock) || 0
        } as Producto
      })
      console.log("Items actualizados:", loaded.length)
      setItems(loaded.length > 0 ? loaded : seed)
    }, (err) => {
      console.error("Error en onSnapshot:", err)
      alert("Error al sincronizar inventario")
    })

    return () => {
      console.log("Deteniendo escucha de items")
      unsubscribe()
    }
  }, [user])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return items
    return items.filter(p =>
      p.nombre.toLowerCase().includes(t) ||
      p.sku.toLowerCase().includes(t) ||
      p.categoria.toLowerCase().includes(t)
    )
  }, [q, items])

  // Moneda segura
  const currency = (n: number | undefined | null) => {
    if (n == null || isNaN(n)) return '$0.00'
    return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  async function saveDraft(e: React.FormEvent) {
    e.preventDefault()

    console.log("=== BOTÓN AGREGAR PULSADO ===")
    console.log("Draft actual:", draft)

    if (!draft.nombre || !draft.sku) {
      alert("Nombre y SKU son obligatorios")
      return
    }

    const id = draft.id || `p-${Date.now()}-${Math.random().toString(36).slice(2,7)}`

    const data = {
      sku: draft.sku,
      nombre: draft.nombre,
      categoria: draft.categoria || '',
      precio: draft.precio || 0,
      stock: draft.stock || 0,
      updatedAt: serverTimestamp(),
      ...(draft.id ? {} : { createdAt: serverTimestamp() })
    }

    console.log("Guardando en Firestore → ID:", id)

    try {
      await setDoc(doc(db, 'items', id), data, { merge: true })
      console.log("Guardado exitoso:", id)
      alert("Producto agregado")
      resetDraft()
    } catch (err: any) {
      console.error("ERROR AL GUARDAR:", err)
      alert("Error al guardar: " + err.message)
    }
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar producto?')) return

    try {
      await deleteDoc(doc(db, 'items', id))
      console.log("Producto borrado:", id)
    } catch (err: any) {
      console.error("Error al borrar:", err)
      alert("Error al borrar")
    }
  }

  function resetDraft() {
    setDraft({ id: '', sku: '', nombre: '', categoria: '', precio: 0, stock: 0 })
  }

  function edit(p: Producto) {
    setDraft(p)
    setTab('catalogo')
  }

  function applyMovimiento(e: React.FormEvent) {
    e.preventDefault()
    if (!mvDraft.productoId || mvDraft.cantidad <= 0) return
    const prod = items.find(p => p.id === mvDraft.productoId)
    if (!prod) return
    const sign = mvDraft.tipo === 'entrada' ? +1 : -1
    const nuevoStock = prod.stock + sign * mvDraft.cantidad
    if (nuevoStock < 0) { alert('Stock insuficiente'); return }

    setItems(prev => prev.map(p => p.id === prod.id ? { ...p, stock: nuevoStock } : p))
    setMovs(prev => [
      { ...mvDraft, id: `m-${Math.random().toString(36).slice(2,9)}`, fecha: new Date().toISOString() },
      ...prev
    ])
    setMvDraft({ id: '', productoId: '', tipo: 'entrada', cantidad: 1, fecha: new Date().toISOString(), nota: '' })
  }

  const LOW = 5
  const lowStock = useMemo(() => items.filter(p => p.stock <= LOW).sort((a, b) => a.stock - b.stock), [items])

  function resetAll() {
    if (!confirm('¿Borrar TODO?')) return
    setItems(seed)
    setMovs([])
    localStorage.removeItem(K_ITEMS)
    localStorage.removeItem(K_MOVS)
  }

  function descargarInventario() {
    const timestamp = new Date().toLocaleString('es-MX')
    const data = items.map(item => ({
      ID: item.id,
      SKU: item.sku,
      Nombre: item.nombre,
      Categoria: item.categoria,
      Precio: item.precio,
      Stock: item.stock,
      Timestamp: timestamp
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario')
    XLSX.writeFile(wb, `inventario_${new Date().toISOString().slice(0,10)}.xlsx`)
    alert("¡Descargado!")
  }

  if (loadingAuth) {
    return <div style={{ padding: '100px', textAlign: 'center' }}>Verificando sesión...</div>
  }

  if (!user) {
    return (
      <div style={{ maxWidth: '500px', margin: '60px auto', padding: '40px', background: '#111', borderRadius: '12px', color: '#fff' }}>
        <h1 style={{ textAlign: 'center' }}>Inventario de Joyería</h1>
        <h2 style={{ textAlign: 'center', margin: '30px 0' }}>Inicia sesión o regístrate</h2>

        <form onSubmit={async (e) => {
          e.preventDefault()
          const email = (e.target as any).regEmail.value.trim()
          const password = (e.target as any).regPassword.value
          try {
            await createUserWithEmailAndPassword(auth, email, password)
            alert("¡Cuenta creada! Ahora inicia sesión.")
          } catch (err: any) {
            alert("Error: " + err.message)
          }
        }} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3>Crear cuenta nueva</h3>
          <input name="regEmail" type="email" placeholder="Email" required style={{ padding: '12px', borderRadius: '6px' }} />
          <input name="regPassword" type="password" placeholder="Contraseña (mín 6)" required minLength={6} style={{ padding: '12px', borderRadius: '6px' }} />
          <button type="submit" className="tab">Registrarme</button>
        </form>

        <hr style={{ margin: '30px 0', borderColor: '#444' }} />

        <form onSubmit={async (e) => {
          e.preventDefault()
          const email = (e.target as any).loginEmail.value.trim()
          const password = (e.target as any).loginPassword.value
          try {
            await signInWithEmailAndPassword(auth, email, password)
            alert("¡Sesión iniciada!")
          } catch (err: any) {
            alert("Error: " + err.message)
          }
        }} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3>Iniciar sesión</h3>
          <input name="loginEmail" type="email" placeholder="Email" required style={{ padding: '12px', borderRadius: '6px' }} />
          <input name="loginPassword" type="password" placeholder="Contraseña" required style={{ padding: '12px', borderRadius: '6px' }} />
          <button type="submit" className="tab">Iniciar sesión</button>
        </form>
      </div>
    )
  }

  return (
    <div className="app">
      <h1>Inventario de Joyería — PWA (sincronizado)</h1>
      <p style={{ textAlign: 'center', color: '#0f0' }}>Bienvenido: {user.email}</p>

      <button 
        onClick={() => signOut(auth).then(() => alert("Sesión cerrada"))}
        style={{ margin: '10px auto', display: 'block' }}
      >
        Cerrar sesión
      </button>

      <div className="nav">
        {tabs.map((t) => (
          <button key={t} className={'tab ' + (tab === t ? 'active' : '')} onClick={() => setTab(t)}>
            {ucFirst(t)}
          </button>
        ))}
      </div>

      {tab === 'debug' && (
        <section className="card">
          <h2>Debug Firebase</h2>
          <TestFirebase />
          <p>Usuario: {user.email} (UID: {user.uid})</p>
        </section>
      )}

      {tab === 'catalogo' && (
        <section className="card">
          <h2>Catálogo</h2>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr', alignItems: 'end' }}>
            <div>
              <label>Buscar</label>
              <input placeholder="Nombre, SKU o categoría" value={q} onChange={e => setQ(e.target.value)} />
              <div className="footer"><small>Sincronizado con Firebase.</small></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <button className="tab" onClick={resetDraft}>Nuevo producto</button>
            </div>
          </div>
          <hr />
          <form onSubmit={saveDraft} style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(6, 1fr)' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label>Nombre</label>
              <input value={draft.nombre} onChange={e => setDraft({ ...draft, nombre: e.target.value })} placeholder="Ej: Anillo plata .925" required />
            </div>
            <div>
              <label>SKU</label>
              <input value={draft.sku} onChange={e => setDraft({ ...draft, sku: e.target.value })} placeholder="Ej: ARO-PLATA-001" required />
            </div>
            <div>
              <label>Categoría</label>
              <input value={draft.categoria} onChange={e => setDraft({ ...draft, categoria: e.target.value })} placeholder="Ej: Anillos" />
            </div>
            <div>
              <label>Precio</label>
              <input type="number" step="0.01" value={draft.precio} onChange={e => setDraft({ ...draft, precio: Number(e.target.value) })} />
            </div>
            <div>
              <label>Stock</label>
              <input type="number" value={draft.stock} onChange={e => setDraft({ ...draft, stock: Number(e.target.value) })} />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
              <button className="tab" type="submit">{draft.id ? 'Guardar cambios' : 'Agregar'}</button>
              {draft.id && <button className="tab" type="button" onClick={resetDraft}>Cancelar</button>}
            </div>
          </form>
          <hr />
          <table>
            <thead>
              <tr>
                <th>Nombre</th><th>SKU</th><th>Categoría</th><th>Precio</th><th>Stock</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>{p.nombre}</td>
                  <td>{p.sku}</td>
                  <td>{p.categoria}</td>
                  <td>{currency(p.precio)}</td>
                  <td>{p.stock ?? 0}</td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <button className="tab" onClick={() => edit(p)}>Editar</button>
                    <button className="tab" onClick={() => remove(p.id)}>Borrar</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6}>Sin resultados.</td></tr>}
            </tbody>
          </table>
        </section>
      )}

      {/* Puedes agregar aquí las otras pestañas cuando las necesites */}
      {/* {tab === 'movimientos' && (...)} */}
      {/* {tab === 'reportes' && (...)} */}
      {/* {tab === 'config' && (...)} */}

      <div className="footer">
        <small>Sincronizado con Firebase • Usuario: {user.email}</small>
      </div>
    </div>
  )
}