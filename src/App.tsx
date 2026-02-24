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
  ubicacion: string
  precio: number
  stock: number
  createdAt?: any
  lastMovement?: any
}

type Movimiento = {
  id: string
  productoId: string
  tipo: 'entrada' | 'salida'
  cantidad: number
  fecha: any
  nota?: string
}

type Ubicacion = {
  id: string
  nombre: string
}

type Tab = 'catalogo' | 'movimientos' | 'reportes' | 'config' | 'debug'

const seed: Producto[] = [
  { id: 'p-001', sku: 'ARO-PLATA-001', nombre: 'Anillo plata .925', categoria: 'Anillos', material: 'Plata', ubicacion: 'Tienda 1', precio: 850, stock: 12 },
  { id: 'p-002', sku: 'CAD-ORO-002', nombre: 'Cadena oro 14k', categoria: 'Cadenas', material: 'Oro', ubicacion: 'Tienda 2', precio: 5200, stock: 3 },
  { id: 'p-003', sku: 'ARE-ACERO-003', nombre: 'Aretes acero', categoria: 'Aretes', material: 'Acero', ubicacion: 'Tienda 1', precio: 250, stock: 22 },
]

const ucFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const tabs = ['catalogo', 'movimientos', 'reportes', 'config', 'debug'] as const

export default function App() {
  const [user, setUser] = useState<any>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [tab, setTab] = useState<Tab>('catalogo')
  const [q, setQ] = useState('')
  const [filtroUbicacion, setFiltroUbicacion] = useState<string>('')
  const [items, setItems] = useState<Producto[]>(seed)
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]) // Lista de ubicaciones
  const [draft, setDraft] = useState<Producto>({ id: '', sku: '', nombre: '', categoria: '', material: '', ubicacion: '', precio: 0, stock: 0 })
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

  // Cargar ubicaciones desde Firestore
  useEffect(() => {
    if (!user) return

    const qUbi = query(collection(db, 'ubicaciones'))
    const unsubscribe = onSnapshot(qUbi, (snapshot) => {
      const loaded = snapshot.docs.map(doc => ({
        id: doc.id,
        nombre: doc.data().nombre
      } as Ubicacion))
      setUbicaciones(loaded)
    })

    return () => unsubscribe()
  }, [user])

  const ubicacionesUnicas = useMemo(() => ubicaciones.map(u => u.nombre).sort(), [ubicaciones])

  // Agregar nueva ubicación
  async function agregarUbicacion() {
    const nombre = prompt("Escribe el nombre de la nueva ubicación (ej. Tienda Centro):")
    if (!nombre || nombre.trim() === '') return

    const id = `ubi-${Date.now()}`
    try {
      await setDoc(doc(db, 'ubicaciones', id), { nombre: nombre.trim() })
      alert("Ubicación agregada")
    } catch (err: any) {
      alert("Error al agregar: " + err.message)
    }
  }

  // Borrar ubicación
  async function borrarUbicacion(id: string, nombre: string) {
    if (!confirm(`¿Borrar ubicación "${nombre}"?`)) return

    // Verificar si hay productos usando esta ubicación
    const productosEnUbicacion = items.some(p => p.ubicacion === nombre)
    if (productosEnUbicacion) {
      alert("No se puede borrar: hay productos en esta ubicación.")
      return
    }

    try {
      await deleteDoc(doc(db, 'ubicaciones', id))
      alert("Ubicación borrada")
    } catch (err: any) {
      alert("Error al borrar: " + err.message)
    }
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
    let filteredItems = items

    if (filtroUbicacion) {
      filteredItems = filteredItems.filter(p => p.ubicacion === filtroUbicacion)
    }

    const t = q.trim().toLowerCase()
    if (!t) return filteredItems

    return filteredItems.filter(p =>
      p.nombre.toLowerCase().includes(t) ||
      p.sku.toLowerCase().includes(t) ||
      p.categoria.toLowerCase().includes(t) ||
      p.material.toLowerCase().includes(t) ||
      p.ubicacion.toLowerCase().includes(t)
    )
  }, [q, items, filtroUbicacion])

  async function saveDraft(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.nombre || !draft.sku) {
      alert("Nombre y SKU son obligatorios")
      return
    }

    // Verificar SKU duplicado
    const skuExistente = items.some(p => p.sku.toLowerCase() === draft.sku.toLowerCase() && p.id !== draft.id)
    if (skuExistente) {
      alert("Este SKU ya existe. Usa uno diferente.")
      return
    }

    const id = draft.id || `p-${Date.now()}`
    const data = {
      sku: draft.sku,
      nombre: draft.nombre,
      categoria: draft.categoria || '',
      material: draft.material || '',
      ubicacion: draft.ubicacion,
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
    setDraft({ id: '', sku: '', nombre: '', categoria: '', material: '', ubicacion: '', precio: 0, stock: 0 })
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
    const opciones = ["1 - Total (todos los productos)"];
    ubicacionesUnicas.forEach((ubicacion, index) => {
      opciones.push(`${index + 2} - ${ubicacion}`);
    });

    const mensaje = "Elige el tipo de reporte:\n\n" + opciones.join("\n") + "\n\nEscribe el número (ej. 1, 2, 3...):";

    const eleccion = prompt(mensaje);

    if (!eleccion) return;

    const num = parseInt(eleccion.trim());

    if (isNaN(num) || num < 1 || num > opciones.length) {
      alert("Opción inválida. Elige un número de la lista.");
      return;
    }

    let filteredItems = items;
    let sheetName = 'Total';
    let nombreArchivo = `inventario_total_${new Date().toISOString().slice(0,10)}.xlsx`;

    if (num > 1) {
      const indexUbicacion = num - 2;
      const ubicacionSeleccionada = ubicacionesUnicas[indexUbicacion];
      filteredItems = items.filter(item => item.ubicacion === ubicacionSeleccionada);
      sheetName = ubicacionSeleccionada;
      nombreArchivo = `inventario_${ubicacionSeleccionada.replace(/ /g, '_')}_${new Date().toISOString().slice(0,10)}.xlsx`;
    }

    // Ordenar por categoría alfabética
    filteredItems.sort((a, b) => a.categoria.localeCompare(b.categoria));

    const data = filteredItems.map(item => ({
      SKU: item.sku,
      Categoría: item.categoria,
      Nombre: item.nombre,
      Precio: item.precio,
      Stock: item.stock,
      Material: item.material,
      ...(num === 1 ? { Ubicación: item.ubicacion } : {}),
      'Fecha Creación': item.createdAt 
        ? (item.createdAt.toDate ? item.createdAt.toDate() : new Date(item.createdAt)).toLocaleString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
        : 'Sin fecha',
      'Último Movimiento': item.lastMovement 
        ? (item.lastMovement.toDate ? item.lastMovement.toDate() : new Date(item.lastMovement)).toLocaleString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
        : 'Sin movimientos'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    XLSX.writeFile(wb, nombreArchivo)
    alert(`Reporte descargado como:\n${nombreArchivo}`)
  }

  if (loadingAuth) return <div style={{ padding: '100px', textAlign: 'center' }}>Cargando...</div>

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
    <div className="app" style={{ maxWidth: '1800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <img 
          src="/ness-logo.png"
          alt="Ness Juweiler"
          style={{ 
            maxWidth: '500px',
            height: 'auto',
            display: 'block',
            margin: '0 auto',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}
        />
      </div>

      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Inventario de Joyería — PWA (sincronizado)</h1>
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
        <section className="card" style={{ maxWidth: '100%', overflowX: 'auto' }}>
          <h2>Catálogo</h2>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'end', marginBottom: '20px' }}>
            <div>
              <label>Buscar</label>
              <input placeholder="Nombre, SKU, categoría, material o ubicación" value={q} onChange={e => setQ(e.target.value)} />
              <div className="footer"><small>Sincronizado con Firebase.</small></div>
            </div>
            <div>
              <label>Filtro por Ubicación</label>
              <select value={filtroUbicacion} onChange={e => setFiltroUbicacion(e.target.value)}>
                <option value="">Todas las tiendas</option>
                {ubicacionesUnicas.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div style={{ textAlign: 'right' }}>
              <button className="tab" onClick={resetDraft}>Nuevo producto</button>
            </div>
          </div>
          <hr />
          <form onSubmit={saveDraft} style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(8, 1fr)', marginBottom: '30px' }}>
            <div>
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
              <label>Ubicación</label>
              <select value={draft.ubicacion} onChange={e => setDraft({ ...draft, ubicacion: e.target.value })} required>
                <option value="">Selecciona ubicación</option>
                {ubicacionesUnicas.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
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
          <table style={{ width: '100%', tableLayout: 'auto' }}>
            <thead>
              <tr>
                <th>Nombre</th><th>SKU</th><th>Categoría</th><th>Material</th><th>Ubicación</th><th>Precio</th><th>Stock</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>{p.nombre}</td>
                  <td>{p.sku}</td>
                  <td>{p.categoria}</td>
                  <td>{p.material}</td>
                  <td>{p.ubicacion}</td>
                  <td>{currency(p.precio)}</td>
                  <td>{p.stock ?? 0}</td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <button className="tab" onClick={() => edit(p)}>Editar</button>
                    <button className="tab" onClick={() => remove(p.id)}>Borrar</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8}>Sin resultados.</td></tr>}
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
          <button className="tab" onClick={descargarInventario} style={{ marginTop: '20px' }}>
            Descargar inventario en Excel
          </button>
        </section>
      )}

      {tab === 'config' && (
        <section className="card">
          <h2>Configuración</h2>
          <button className="tab" onClick={resetAll}>Borrar TODO (dev)</button>
          <hr />
          <h3>Ubicaciones</h3>
          <table>
            <thead>
              <tr>
                <th>Ubicación</th><th></th>
              </tr>
            </thead>
            <tbody>
              {ubicaciones.map(u => (
                <tr key={u.id}>
                  <td>{u.nombre}</td>
                  <td>
                    <button className="tab" onClick={() => borrarUbicacion(u.id, u.nombre)}>Borrar</button>
                  </td>
                </tr>
              ))}
              {ubicaciones.length === 0 && <tr><td colSpan={2}>No hay ubicaciones.</td></tr>}
            </tbody>
          </table>
        </section>
      )}

      <div className="footer">
        <small>Sincronizado con Firebase • Usuario: {user.email}</small>
      </div>
    </div>
  )
}