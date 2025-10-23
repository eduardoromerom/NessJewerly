import { useMemo, useState, useEffect } from 'react'
import './index.css'

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

type Tab = 'catalogo' | 'movimientos' | 'reportes' | 'config'

// Claves de almacenamiento local
const K_ITEMS = 'inv.joyeria.items.v1'
const K_MOVS  = 'inv.joyeria.movs.v1'

// Datos de ejemplo para arrancar
const seed: Producto[] = [
  { id: 'p-001', sku: 'ARO-PLATA-001', nombre: 'Anillo plata .925', categoria: 'Anillos', precio: 850, stock: 12 },
  { id: 'p-002', sku: 'CAD-ORO-002', nombre: 'Cadena oro 14k', categoria: 'Cadenas', precio: 5200, stock: 3 },
  { id: 'p-003', sku: 'ARE-ACERO-003', nombre: 'Aretes acero', categoria: 'Aretes', precio: 250, stock: 22 },
]

// Helper para capitalizar sin que TypeScript se queje con noUncheckedIndexedAccess
const ucFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const tabs = ['catalogo','movimientos','reportes','config'] as const

export default function App() {
  const [tab, setTab] = useState<Tab>('catalogo')

  // --- Estado de Catálogo ---
  const [q, setQ] = useState('') // búsqueda
  const [items, setItems] = useState<Producto[]>(() => {
    try {
      const raw = localStorage.getItem(K_ITEMS)
      const parsed = raw ? (JSON.parse(raw) as Producto[]) : null
      return parsed?.length ? parsed : seed
    } catch {
      return seed
    }
  })
  useEffect(() => {
    try { localStorage.setItem(K_ITEMS, JSON.stringify(items)) } catch {}
  }, [items])

  // draft del formulario de producto
  const [draft, setDraft] = useState<Producto>({
    id:'', sku:'', nombre:'', categoria:'', precio:0, stock:0
  })

  // filtrado por búsqueda (nombre, SKU, categoría)
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return items
    return items.filter(p =>
      p.nombre.toLowerCase().includes(t) ||
      p.sku.toLowerCase().includes(t) ||
      p.categoria.toLowerCase().includes(t)
    )
  }, [q, items])

  // CRUD de productos
  function resetDraft(){ setDraft({ id:'', sku:'', nombre:'', categoria:'', precio:0, stock:0 }) }
  function edit(p:Producto){ setDraft(p); setTab('catalogo') }
  function remove(id:string){
    if (!confirm('¿Eliminar producto?')) return
    setItems(prev => prev.filter(p=>p.id!==id))
    // (opcional) limpieza de movimientos relacionados
    setMovs(prev => prev.filter(m => m.productoId !== id))
  }
  function saveDraft(e:React.FormEvent){
    e.preventDefault()
    if (!draft.nombre || !draft.sku) return
    const id = draft.id || `p-${Math.random().toString(36).slice(2,7)}`
    setItems(prev => draft.id
      ? prev.map(p => p.id===draft.id ? { ...draft, id } : p) // edición
      : [{ ...draft, id }, ...prev]                           // alta
    )
    resetDraft()
  }

  // --- Estado de Movimientos ---
  const [movs, setMovs] = useState<Movimiento[]>(() => {
    try {
      const raw = localStorage.getItem(K_MOVS)
      return raw ? (JSON.parse(raw) as Movimiento[]) : []
    } catch {
      return []
    }
  })
  useEffect(() => {
    try { localStorage.setItem(K_MOVS, JSON.stringify(movs)) } catch {}
  }, [movs])

  // draft de movimiento (entrada/salida)
  const [mvDraft, setMvDraft] = useState<Movimiento>({
    id:'', productoId:'', tipo:'entrada', cantidad:1,
    fecha:new Date().toISOString(), nota:''
  })

  // aplicar movimiento = ajustar stock + registrar historial
  function applyMovimiento(e:React.FormEvent){
    e.preventDefault()
    if (!mvDraft.productoId || mvDraft.cantidad <= 0) return
    const prod = items.find(p => p.id === mvDraft.productoId)
    if (!prod) return
    const sign = mvDraft.tipo === 'entrada' ? +1 : -1
    const nuevoStock = prod.stock + sign * mvDraft.cantidad
    if (nuevoStock < 0) { alert('Stock insuficiente para salida'); return }

    // 1) actualizamos stock
    setItems(prev => prev.map(p => p.id===prod.id ? { ...p, stock: nuevoStock } : p))
    // 2) registramos movimiento
    setMovs(prev => [
      { ...mvDraft, id: `m-${Math.random().toString(36).slice(2,9)}`, fecha: new Date().toISOString() },
      ...prev
    ])
    // 3) limpiamos formulario
    setMvDraft({ id:'', productoId:'', tipo:'entrada', cantidad:1, fecha:new Date().toISOString(), nota:'' })
  }

  // --- Reporte rápido: stock bajo ---
  const LOW = 5
  const lowStock = useMemo(
    () => items.filter(p => p.stock <= LOW).sort((a,b)=>a.stock-b.stock),
    [items]
  )

  const currency = (n:number) => `$${n.toLocaleString()}`

  function resetAll(){
    if (!confirm('¿Borrar TODO (catálogo y movimientos)?')) return
    setItems(seed)
    setMovs([])
    localStorage.removeItem(K_ITEMS)
    localStorage.removeItem(K_MOVS)
  }

  return (
    <div className="app">
      <h1>Inventario de Joyería — PWA (offline)</h1>

      <div className="nav">
        {tabs.map((t) => (
          <button key={t}
                  className={'tab ' + (tab===t ? 'active':'' )}
                  onClick={() => setTab(t)}>
            {ucFirst(t)}
          </button>
        ))}
      </div>

      {/* ===== CATALOGO ===== */}
      {tab==='catalogo' && (
        <section className="card">
          <h2>Catálogo</h2>

          <div style={{display:'grid', gap:12, gridTemplateColumns:'1fr 1fr', alignItems:'end'}}>
            <div>
              <label>Buscar</label>
              <input placeholder="Nombre, SKU o categoría" value={q} onChange={e=>setQ(e.target.value)} />
              <div className="footer"><small>Datos guardados localmente (offline).</small></div>
            </div>
            <div style={{textAlign:'right'}}>
              <button className="tab" onClick={resetDraft}>Nuevo producto</button>
            </div>
          </div>

          <hr />

          <form onSubmit={saveDraft} style={{display:'grid', gap:12, gridTemplateColumns:'repeat(6, 1fr)'}}>
            <div style={{gridColumn:'span 2'}}>
              <label>Nombre</label>
              <input value={draft.nombre} onChange={e=>setDraft({...draft, nombre:e.target.value})} placeholder="Ej: Anillo plata .925" required />
            </div>
            <div>
              <label>SKU</label>
              <input value={draft.sku} onChange={e=>setDraft({...draft, sku:e.target.value})} placeholder="Ej: ARO-PLATA-001" required />
            </div>
            <div>
              <label>Categoría</label>
              <input value={draft.categoria} onChange={e=>setDraft({...draft, categoria:e.target.value})} placeholder="Ej: Anillos" />
            </div>
            <div>
              <label>Precio</label>
              <input type="number" step="0.01" value={draft.precio} onChange={e=>setDraft({...draft, precio:Number(e.target.value)})} />
            </div>
            <div>
              <label>Stock</label>
              <input type="number" value={draft.stock} onChange={e=>setDraft({...draft, stock:Number(e.target.value)})} />
            </div>
            <div style={{display:'flex', gap:8, alignItems:'end'}}>
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
              {filtered.map(p=>(
                <tr key={p.id}>
                  <td>{p.nombre}</td>
                  <td>{p.sku}</td>
                  <td>{p.categoria}</td>
                  <td>{currency(p.precio)}</td>
                  <td>{p.stock}</td>
                  <td style={{display:'flex', gap:8}}>
                    <button className="tab" onClick={()=>edit(p)}>Editar</button>
                    <button className="tab" onClick={()=>remove(p.id)}>Borrar</button>
                  </td>
                </tr>
              ))}
              {filtered.length===0 && <tr><td colSpan={6}>Sin resultados.</td></tr>}
            </tbody>
          </table>
        </section>
      )}

      {/* ===== MOVIMIENTOS ===== */}
      {tab==='movimientos' && (
        <section className="card">
          <h2>Movimientos</h2>
          {/* Formulario: aplica entrada/salida y ajusta el stock del producto */}
          <form onSubmit={applyMovimiento} style={{display:'grid', gap:12, gridTemplateColumns:'repeat(6, 1fr)'}}>
            <div style={{gridColumn:'span 2'}}>
              <label>Producto</label>
              <select value={mvDraft.productoId} onChange={e=>setMvDraft({...mvDraft, productoId:e.target.value})} required>
                <option value="">— Selecciona —</option>
                {items.map(p=> <option key={p.id} value={p.id}>{p.nombre} · {p.sku} (stock {p.stock})</option>)}
              </select>
            </div>
            <div>
              <label>Tipo</label>
              <select value={mvDraft.tipo} onChange={e=>setMvDraft({...mvDraft, tipo:e.target.value as 'entrada'|'salida'})}>
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
              </select>
            </div>
            <div>
              <label>Cantidad</label>
              <input type="number" min={1} value={mvDraft.cantidad} onChange={e=>setMvDraft({...mvDraft, cantidad:Number(e.target.value)})} required />
            </div>
            <div style={{gridColumn:'span 2'}}>
              <label>Nota (opcional)</label>
              <input value={mvDraft.nota||''} onChange={e=>setMvDraft({...mvDraft, nota:e.target.value})} placeholder="Cliente, compra, reparación, etc." />
            </div>
            <div style={{display:'flex', alignItems:'end'}}>
              <button className="tab" type="submit">Aplicar</button>
            </div>
          </form>

          <hr />

          {/* Historial de movimientos */}
          <table>
            <thead>
              <tr>
                <th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Nota</th>
              </tr>
            </thead>
            <tbody>
              {movs.map(m=>{
                const p = items.find(x=>x.id===m.productoId)
                return (
                  <tr key={m.id}>
                    <td>{new Date(m.fecha).toLocaleString()}</td>
                    <td>{p ? `${p.nombre} (${p.sku})` : m.productoId}</td>
                    <td>{m.tipo}</td>
                    <td>{m.cantidad}</td>
                    <td>{m.nota || '—'}</td>
                  </tr>
                )
              })}
              {movs.length===0 && <tr><td colSpan={5}>Aún no hay movimientos.</td></tr>}
            </tbody>
          </table>
        </section>
      )}

      {/* ===== REPORTES ===== */}
      {tab==='reportes' && (
        <section className="card">
          <h2>Reportes</h2>
          <h3 style={{marginTop:0}}>Stock bajo (≤ {LOW})</h3>
          <table>
            <thead>
              <tr><th>Producto</th><th>SKU</th><th>Stock</th></tr>
            </thead>
            <tbody>
              {lowStock.map(p=>(
                <tr key={p.id}>
                  <td>{p.nombre}</td><td>{p.sku}</td><td>{p.stock}</td>
                </tr>
              ))}
              {lowStock.length===0 && <tr><td colSpan={3}>Todo en orden.</td></tr>}
            </tbody>
          </table>
        </section>
      )}

      {/* ===== CONFIG ===== */}
      {tab==='config' && (
        <section className="card">
          <h2>Configuración</h2>
          <ul>
            <li>Nombre de la tienda, moneda, etc.</li>
            <li>PWA lista: instalable en compu y celular; funciona offline.</li>
            <li>Botón de desarrollo:</li>
          </ul>
          <button className="tab" onClick={resetAll}>Borrar TODO (dev)</button>
        </section>
      )}

      <div className="footer"><small>Offline-first · datos en este dispositivo · listo para sincronizar luego.</small></div>
    </div>
  )
}
