import { useMemo, useState, useEffect } from 'react'
import './index.css'
import TestFirebase from './components/TestFirebase'
import {
  collection,
  query,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  addDoc
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
  material: string
  precio: number
  stock: number
  createdAt?: any
  lastMovement?: any // Para timestamp del último movimiento
}

type Movimiento = {
  id: string
  productoId: string
  tipo: 'entrada' | 'salida'
  cantidad: number
  fecha: any
  nota?: string
}

type Tab = 'catalogo' | 'movimientos' | 'reportes' | 'config' | 'debug'

const seed: Producto[] = [
  { id: 'p-001', sku: 'ARO-PLATA-001', nombre: 'Anillo plata .925', categoria: 'Anillos', material: 'Plata', precio: 850, stock: 12 },
  { id: 'p-002', sku: 'CAD-ORO-002', nombre: 'Cadena oro 14k', categoria: 'Cadenas', material: 'Oro', precio: 5200, stock: 3 },
  { id: 'p-003', sku: 'ARE-ACERO-003', nombre: 'Aretes acero', categoria: 'Aretes', material: 'Acero', precio: 250, stock: 22 },
]

const ucFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const tabs = ['catalogo', 'movimientos', 'reportes', 'config', 'debug'] as const

export default function App() {
  const [user, setUser] = useState<any>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [tab, setTab] = useState<Tab>('catalogo')
  const [q, setQ] = useState('')
  const [items, setItems] = useState<Producto[]>(seed)
  const [draft, setDraft] = useState<Producto>({ id: '', sku: '', nombre: '', categoria: '', material: '', precio: 0, stock: 0 })
  const [mvDraft, setMvDraft] = useState<Movimiento>({
    id: '', productoId: '', tipo: 'entrada', cantidad: 1, fecha: serverTimestamp(), nota: ''
  })
  const [movs, setMovs] = useState<Movimiento[]>([])

  const LOW = 5
  const lowStock = useMemo(() => items.filter(p => p.stock <= LOW).sort((a, b) => a.stock - b.stock), [items])

  const currency = (n: number | undefined | null) => {
    if (n == null || isNaN(n)) return '$0.00'
    return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoadingAuth(false)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return

    const qRef = query(collection(db, 'items'))
    const unsubscribe = onSnapshot(qRef, (snapshot) => {
      const loaded = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Producto))
      setItems(loaded.length > 0 ? loaded : seed)
    })

    return () => unsubscribe()
  }, [user])

  useEffect(() => {
    if (!user) return

    const qRef = query(collection(db, 'movimientos'))
    const unsubscribe = onSnapshot(qRef, (snapshot) => {
      const loaded = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fecha: doc.data().fecha.toDate()
      } as Movimiento))
      setMovs(loaded)
    })

    return () => unsubscribe()
  }, [user])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return items
    return items.filter(p =>
      p.nombre.toLowerCase().includes(t) ||
      p.sku.toLowerCase().includes(t) ||
      p.categoria.toLowerCase().includes(t) ||
      p.material.toLowerCase().includes(t) // Agregado búsqueda por material
    )
  }, [q, items])

  async function saveDraft(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.nombre || !draft.sku) {
      alert("Nombre y SKU son obligatorios")
      return
    }

    const id = draft.id || `p-${Date.now()}`
    const data = {
      sku: draft.sku,
      nombre: draft.nombre,
      categoria: draft.categoria || '',
      material: draft.material || '',
      precio: draft.precio || 0,
      stock: draft.stock || 0,
      updatedAt: serverTimestamp(),
      ...(draft.id ? {} : { createdAt: serverTimestamp() })
    }

    try {
      await setDoc(doc(db, 'items', id), data, { merge: true })
      alert("Producto guardado")
      resetDraft()
    } catch (err: any) {
      alert("Error al guardar: " + err.message)
    }
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar?')) return
    try {
      await deleteDoc(doc(db, 'items', id))
    } catch (err: any) {
      alert("Error al eliminar")
    }
  }

  function resetDraft() {
    setDraft({ id: '', sku: '', nombre: '', categoria: '', material: '', precio: 0, stock: 0 })
  }

  function edit(p: Producto) {
    setDraft(p)
    setTab('catalogo')
  }

  async function applyMovimiento(e: React.FormEvent) {
    e.preventDefault()
    if (!mvDraft.productoId || mvDraft.cantidad <= 0) return

    const prod = items.find(p => p.id === mvDraft.productoId)
    if (!prod) return

    const sign = mvDraft.tipo === 'entrada' ? 1 : -1
    const nuevoStock = prod.stock + sign * mvDraft.cantidad
    if (nuevoStock < 0) {
      alert('Stock insuficiente')
      return
    }

    try {
      await setDoc(doc(db, 'items', prod.id), { stock: nuevoStock, lastMovement: serverTimestamp() }, { merge: true })
      await addDoc(collection(db, 'movimientos'), {
        productoId: mvDraft.productoId,
        tipo: mvDraft.tipo,
        cantidad: mvDraft.cantidad,
        fecha: serverTimestamp(),
        nota: mvDraft.nota || ''
      })
      alert("Movimiento registrado")
      setMvDraft({ id: '', productoId: '', tipo: 'entrada', cantidad: 1, fecha: serverTimestamp(), nota: '' })
    } catch (err: any) {
      alert("Error en movimiento: " + err.message)
    }
  }

  function resetAll() {
    if (!confirm('¿Borrar TODO?')) return
    setItems(seed)
    setMovs([])
  }

  function descargarInventario() {
    const data = items.map(item => {
      let fechaCreacion = 'Sin fecha'
      if (item.createdAt) {
        const date = item.createdAt.toDate ? item.createdAt.toDate() : new Date(item.createdAt)
        fechaCreacion = date.toLocaleString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      }

      let ultimoMovimiento = 'Sin movimientos'
      if (item.lastMovement) {
        const date = item.lastMovement.toDate ? item.lastMovement.toDate() : new Date(item.lastMovement)
        ultimoMovimiento = date.toLocaleString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      }

      return {
        SKU: item.sku,
        Nombre: item.nombre,
        Categoria: item.categoria,
        Material: item.material,
        Precio: item.precio,
        Stock: item.stock,
        'Fecha Creación': fechaCreacion,
        'Último Movimiento': ultimoMovimiento
      }
    })

    const now = new Date()
    const fechaHora = now.toLocaleString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/[/,: ]/g, '-')
    const nombreArchivo = `inventario_${fechaHora}.xlsx`

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario')
    XLSX.writeFile(wb, nombreArchivo)
    alert("Inventario descargado")
  }

  if (loadingAuth) return <div style={{ padding: '100px', textAlign: 'center' }}>Cargando...</div>

  if (!user) {
    // Pantalla de login/registro
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
            alert("Cuenta creada")
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
            alert("Sesión iniciada")
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
      <img src="/ness-logo.png" alt="Ness Juweiler" style={{ display: 'block', margin: '0 auto', width: '200px' }} /> {/* Imagen de la marca en la app */}

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
              <label>Material</label>
              <input value={draft.material} onChange={e => setDraft({ ...draft, material: e.target.value })} placeholder="Ej: Plata" />
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
                <th>Nombre</th><th>SKU</th><th>Categoría</th><th>Material</th><th>Precio</th><th>Stock</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>{p.nombre}</td>
                  <td>{p.sku}</td>
                  <td>{p.categoria}</td>
                  <td>{p.material}</td>
                  <td>{currency(p.precio)}</td>
                  <td>{p.stock}</td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <button className="tab" onClick={() => edit(p)}>Editar</button>
                    <button className="tab" onClick={() => remove(p.id)}>Borrar</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7}>Sin resultados.</td></tr>}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'movimientos' && (
        <section className="card">
          <h2>Movimientos</h2>
          <form onSubmit={applyMovimiento} style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(6, 1fr)' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label>Producto</label>
              <select value={mvDraft.productoId} onChange={e => setMvDraft({ ...mvDraft, productoId: e.target.value })} required>
                <option value="">— Selecciona —</option>
                {items.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} · {p.sku} (stock {p.stock})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Tipo</label>
              <select value={mvDraft.tipo} onChange={e => setMvDraft({ ...mvDraft, tipo: e.target.value as 'entrada' | 'salida' })}>
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
              </select>
            </div>
            <div>
              <label>Cantidad</label>
              <input type="number" min={1} value={mvDraft.cantidad} onChange={e => setMvDraft({ ...mvDraft, cantidad: Number(e.target.value) })} required />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label>Nota (opcional)</label>
              <input value={mvDraft.nota || ''} onChange={e => setMvDraft({ ...mvDraft, nota: e.target.value })} placeholder="Cliente, reparación, etc." />
            </div>
            <div style={{ display: 'flex', alignItems: 'end' }}>
              <button className="tab" type="submit">Aplicar</button>
            </div>
          </form>
          <hr />
          <table>
            <thead>
              <tr>
                <th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Nota</th>
              </tr>
            </thead>
            <tbody>
              {movs.map(m => {
                const p = items.find(x => x.id === m.productoId)
                return (
                  <tr key={m.id}>
                    <td>{m.fecha.toLocaleString()}</td>
                    <td>{p ? `${p.nombre} (${p.sku})` : m.productoId}</td>
                    <td>{m.tipo}</td>
                    <td>{m.cantidad}</td>
                    <td>{m.nota || '—'}</td>
                  </tr>
                )
              })}
              {movs.length === 0 && <tr><td colSpan={5}>Aún no hay movimientos.</td></tr>}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'reportes' && (
        <section className="card">
          <h2>Reportes</h2>
          <h3>Stock bajo (≤ {LOW})</h3>
          <table>
            <thead>
              <tr>
                <th>Producto</th><th>SKU</th><th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map(p => (
                <tr key={p.id}>
                  <td>{p.nombre}</td><td>{p.sku}</td><td>{p.stock}</td>
                </tr>
              ))}
              {lowStock.length === 0 && <tr><td colSpan={3}>Todo en orden.</td></tr>}
            </tbody>
          </table>
          <button className="tab" onClick={descargarInventario} style={{ marginTop: '30px' }}>
            Descargar inventario en Excel
          </button>
        </section>
      )}

      {tab === 'config' && (
        <section className="card">
          <h2>Configuración</h2>
          <button className="tab" onClick={resetAll}>Borrar TODO (dev)</button>
        </section>
      )}

      <div className="footer">
        <small>Sincronizado con Firebase • Usuario: {user.email}</small>
      </div>
    </div>
  )
}