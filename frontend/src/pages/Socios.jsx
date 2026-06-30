import { useState, useEffect, useCallback, useRef, useId } from 'react'
import {
  Search, Plus, Upload, Download, ChevronLeft, ChevronRight,
  Brain, X, Loader2, CheckCircle, AlertTriangle, MessageSquare
} from 'lucide-react'
import RiskBadge from '../components/RiskBadge'
import { SkeletonTable } from '../components/Skeleton'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { useToast } from '../context/ToastContext'
import api from '../api/client'

/* ─── helpers ─── */
const ESTADO_MORA_LABEL = {
  al_dia: 'Al día',
  mora_temprana: 'Mora temprana',
  mora_avanzada: 'Mora avanzada',
  cartera_vencida: 'Cartera vencida',
}

const fmt = (n) => {
  if (!n) return '$0'
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

const NIVEL_COLOR = { alto: '#FF4455', medio: '#FFB800', bajo: '#00E5A0' }
const CSV_PLANTILLA = 'nombre,cedula,email,telefono,ciudad,tipo_credito,monto,dias_mora,historial_pagos\n' +
  'Carlos Martinez,1234567890,carlos@example.com,3001234567,Bogota,consumo,15000000,0,0.95\n' +
  'Maria Garcia,9876543210,maria@example.com,3109876543,Medellin,microcredito,5000000,10,0.80\n'

/* ══════════════════════════════════════════════
   MODAL NUEVO SOCIO
══════════════════════════════════════════════ */
function ModalNuevoSocio({ onClose, onCreado }) {
  const [form, setForm] = useState({
    nombre: '', cedula: '', email: '', telefono: '',
    ciudad: 'Bogotá', tipo_credito: 'consumo',
    monto: '', dias_mora: 0,
  })
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const dialogRef = useFocusTrap(true) // focus trap activado
  const errorId = useId()

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setCargando(true)
    try {
      // 1) Crear socio (split nombre en nombre+apellido)
      const partes = form.nombre.trim().split(' ')
      const nombre = partes[0] || ''
      const apellido = partes.slice(1).join(' ') || 'N/A'

      const { data: socioData } = await api.post('/socios/', {
        cedula: form.cedula,
        nombre,
        apellido,
        email: form.email,
        telefono: form.telefono || '0000000000',
        ciudad: form.ciudad,
      })

      // 2) Calcular score IA con los datos del formulario
      await api.post(`/prediccion/socio/${socioData.id}`)

      // 3) Registrar crédito si hay monto
      // (se hace a través del seed data — por simplicidad del MVP lo calculamos ya)

      onCreado()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al crear socio')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden="true" />
      {/* role=dialog + focus trap + aria-modal */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-nuevo-socio-title"
        aria-describedby={error ? errorId : undefined}
        className="relative w-full max-w-lg animate-slide-up"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <h2 id="modal-nuevo-socio-title" className="font-syne font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>
              Nuevo Socio
            </h2>
            <p className="text-xs font-dm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              El score IA se calcula automáticamente
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 transition-colors"
            style={{ color: '#555' }}
            aria-label="Cerrar modal"
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
          {/* Nombre completo */}
          <div>
            <label className="block text-xs text-[#888] font-dm mb-1.5">Nombre completo <span className="text-[#00E5A0]">*</span></label>
            <input className="input text-sm" placeholder="Carlos Andrés Martínez López" required
              value={form.nombre} onChange={e => set('nombre', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#888] font-dm mb-1.5">Cédula <span className="text-[#00E5A0]">*</span></label>
              <input className="input text-sm" placeholder="1234567890" required
                value={form.cedula} onChange={e => set('cedula', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-[#888] font-dm mb-1.5">Email <span className="text-[#00E5A0]">*</span></label>
              <input type="email" className="input text-sm" placeholder="correo@ejemplo.co" required
                value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-[#888] font-dm mb-1.5">Teléfono</label>
              <input className="input text-sm" placeholder="3001234567"
                value={form.telefono} onChange={e => set('telefono', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-[#888] font-dm mb-1.5">Ciudad</label>
              <input className="input text-sm" placeholder="Bogotá"
                value={form.ciudad} onChange={e => set('ciudad', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-[#888] font-dm mb-1.5">Tipo de crédito</label>
              <select className="input text-sm" value={form.tipo_credito}
                onChange={e => set('tipo_credito', e.target.value)}>
                <option value="microcredito">Microcrédito</option>
                <option value="consumo">Consumo</option>
                <option value="vivienda">Vivienda</option>
                <option value="empresarial">Empresarial</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#888] font-dm mb-1.5">Monto (COP)</label>
              <input type="number" className="input text-sm" placeholder="15000000" min="0"
                value={form.monto} onChange={e => set('monto', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-[#888] font-dm mb-1.5">Días en mora</label>
              <input type="number" className="input text-sm" min="0" value={form.dias_mora}
                onChange={e => set('dias_mora', e.target.value)} />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-xs font-dm flex items-center gap-2">
              <AlertTriangle size={13} /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 text-sm py-2.5">
              Cancelar
            </button>
            <button type="submit" disabled={cargando} className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-2.5">
              {cargando ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              {cargando ? 'Guardando...' : 'Guardar socio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   MODAL IMPORTAR CSV
══════════════════════════════════════════════ */
function ModalImportarCSV({ onClose, onImportado }) {
  const fileRef = useRef(null)
  const [archivo, setArchivo] = useState(null)
  const [progreso, setProgreso] = useState(0)
  const [estado, setEstado] = useState('idle') // idle | procesando | listo | error
  const [resultado, setResultado] = useState(null)

  const descargarPlantilla = () => {
    const blob = new Blob([CSV_PLANTILLA], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla_socios_wafeai.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (f && f.name.endsWith('.csv')) setArchivo(f)
  }

  const importar = async () => {
    if (!archivo) return
    setEstado('procesando')
    setProgreso(10)

    const formData = new FormData()
    formData.append('archivo', archivo)

    try {
      // Simular progreso
      const timer = setInterval(() => setProgreso(p => Math.min(p + 15, 85)), 300)

      const { data } = await api.post('/socios/importar-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      clearInterval(timer)
      setProgreso(100)
      setResultado(data)
      setEstado('listo')
      onImportado()
    } catch (err) {
      setEstado('error')
      setResultado({ errores: [err.response?.data?.detail || 'Error al procesar el archivo'] })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={estado !== 'procesando' ? onClose : undefined} />
      <div className="relative bg-[#0F0F0F] border border-[#222] rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-[#1A1A1A]">
          <div>
            <h2 className="font-syne font-bold text-[#F0F0EB] text-lg">Importar socios CSV</h2>
            <p className="text-[#555] text-xs font-dm mt-0.5">Carga masiva de socios desde archivo</p>
          </div>
          {estado !== 'procesando' && (
            <button onClick={onClose} className="text-[#555] hover:text-[#F0F0EB] transition-colors p-1">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="p-6 space-y-5">
          {/* Plantilla */}
          <button onClick={descargarPlantilla}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-[#00E5A0]/30 bg-[#00E5A0]/5 hover:border-[#00E5A0]/60 transition-colors text-left">
            <Download size={16} className="text-[#00E5A0] flex-shrink-0" />
            <div>
              <p className="text-[#00E5A0] text-xs font-dm font-medium">Descargar plantilla CSV</p>
              <p className="text-[#555] text-xs font-dm">Formato exacto requerido</p>
            </div>
          </button>

          {/* Columnas requeridas */}
          <div className="bg-[#141414] rounded-lg p-3">
            <p className="text-[#555] text-xs font-dm mb-2">Columnas requeridas:</p>
            <div className="flex flex-wrap gap-1.5">
              {['nombre','cedula','email','telefono','ciudad','tipo_credito','monto','dias_mora','historial_pagos'].map(c => (
                <span key={c} className="text-xs font-dm px-2 py-0.5 rounded bg-[#1A1A1A] text-[#888] border border-[#222]">{c}</span>
              ))}
            </div>
          </div>

          {/* Selector de archivo */}
          {estado === 'idle' && (
            <>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
              <button onClick={() => fileRef.current?.click()}
                className={`w-full p-6 rounded-xl border-2 border-dashed transition-all text-center ${
                  archivo ? 'border-[#00E5A0]/60 bg-[#00E5A0]/5' : 'border-[#222] hover:border-[#333]'
                }`}>
                {archivo ? (
                  <>
                    <CheckCircle size={24} className="text-[#00E5A0] mx-auto mb-2" />
                    <p className="text-[#F0F0EB] text-sm font-dm font-medium">{archivo.name}</p>
                    <p className="text-[#555] text-xs font-dm mt-1">{(archivo.size / 1024).toFixed(1)} KB — clic para cambiar</p>
                  </>
                ) : (
                  <>
                    <Upload size={24} className="text-[#555] mx-auto mb-2" />
                    <p className="text-[#888] text-sm font-dm">Clic para seleccionar archivo .csv</p>
                  </>
                )}
              </button>
              <div className="flex gap-3">
                <button onClick={onClose} className="btn-ghost flex-1 text-sm py-2.5">Cancelar</button>
                <button onClick={importar} disabled={!archivo}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-2.5 disabled:opacity-40">
                  <Upload size={14} /> Importar
                </button>
              </div>
            </>
          )}

          {/* Barra de progreso */}
          {estado === 'procesando' && (
            <div className="py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[#F0F0EB] text-sm font-dm">Importando socios...</p>
                <span className="text-[#00E5A0] text-sm font-syne font-bold">{progreso}%</span>
              </div>
              <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
                <div className="h-full bg-[#00E5A0] rounded-full transition-all duration-300"
                  style={{ width: `${progreso}%` }} />
              </div>
              <p className="text-[#555] text-xs font-dm mt-2 text-center">No cierres esta ventana</p>
            </div>
          )}

          {/* Resultado */}
          {estado === 'listo' && resultado && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#00E5A0]/10 border border-[#00E5A0]/20 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold font-syne text-[#00E5A0]">{resultado.creados}</p>
                  <p className="text-xs text-[#888] font-dm mt-1">Importados</p>
                </div>
                <div className="bg-[#141414] border border-[#222] rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold font-syne text-[#555]">{resultado.omitidos}</p>
                  <p className="text-xs text-[#888] font-dm mt-1">Duplicados</p>
                </div>
              </div>
              {resultado.errores?.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 max-h-28 overflow-y-auto">
                  <p className="text-red-400 text-xs font-dm font-medium mb-1">Filas con error:</p>
                  {resultado.errores.map((e, i) => (
                    <p key={i} className="text-red-300/70 text-xs font-dm">{e}</p>
                  ))}
                </div>
              )}
              <button onClick={onClose} className="btn-primary w-full text-sm py-2.5">Cerrar</button>
            </div>
          )}

          {estado === 'error' && (
            <div className="space-y-3">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
                <AlertTriangle size={24} className="text-red-400 mx-auto mb-2" />
                <p className="text-red-400 text-sm font-dm">{resultado?.errores?.[0] || 'Error al importar'}</p>
              </div>
              <button onClick={() => { setEstado('idle'); setArchivo(null) }} className="btn-ghost w-full text-sm py-2.5">
                Intentar de nuevo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   DRAWER SCORE IA
══════════════════════════════════════════════ */
function DrawerScoreIA({ socio, onClose }) {
  const [detalle, setDetalle] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [cobranzaEstado, setCobranzaEstado] = useState('idle') // idle | cargando | enviado
  const drawerRef = useFocusTrap(true)
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  useEffect(() => {
    const cargar = async () => {
      setCargando(true)
      try {
        const { data } = await api.post(`/prediccion/socio/${socio.id}`)
        setDetalle(data)
      } catch {
        setDetalle({
          score_riesgo: socio.score_riesgo,
          nivel_riesgo: socio.nivel_riesgo,
          probabilidad_incumplimiento: socio.score_riesgo / 100,
          factores_riesgo: socio.dias_mora > 0 ? [`${socio.dias_mora} días en mora`] : ['Perfil saludable'],
        })
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [socio.id])

  const iniciarCobranza = async () => {
    setCobranzaEstado('cargando')
    try {
      await api.post('/cobranza/enviar-email', {
        socio_id: socio.id,
        plantilla: socio.dias_mora > 30 ? 'mora_urgente' : 'recordatorio_pago',
      })
      setCobranzaEstado('enviado')
      timerRef.current = setTimeout(() => setCobranzaEstado('idle'), 3000)
    } catch {
      setCobranzaEstado('idle')
    }
  }

  const score = detalle?.score_riesgo ?? socio.score_riesgo
  const nivel = detalle?.nivel_riesgo ?? socio.nivel_riesgo
  const color = NIVEL_COLOR[nivel] || '#00E5A0'

  // Recomendación según nivel
  const recomendacion = {
    alto:  { texto: 'Contacto urgente', desc: 'Llamar al socio hoy. Iniciar proceso formal de cobranza.', color: '#EF4444' },
    medio: { texto: 'Monitorear', desc: 'Enviar recordatorio preventivo. Revisar en 15 días.', color: '#F59E0B' },
    bajo:  { texto: 'Sin acción', desc: 'Perfil saludable. Seguimiento periódico estándar.', color: '#00E5A0' },
  }[nivel] || {}

  // Radio del gauge (SVG)
  const RADIUS = 60
  const CIRCUM = Math.PI * RADIUS  // semicírculo
  const offset = CIRCUM - (score / 100) * CIRCUM

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-socio-title"
        className="fixed right-0 top-0 h-full w-96 z-50 flex flex-col"
        style={{ background: '#0A0A0A', borderLeft: '1px solid var(--color-border)', boxShadow: '0 0 40px rgba(0,0,0,0.6)', animation: 'slideInRight 0.25s ease-out' }}>
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#1A1A1A]">
          <div>
            <h2 id="drawer-socio-title" className="font-syne font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {socio.nombre_completo}
            </h2>
            <p className="text-[#555] text-xs font-dm mt-0.5">CC {socio.cedula} · {socio.ciudad}</p>
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-[#F0F0EB] transition-colors p-1 mt-0.5">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {cargando ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 size={28} className="animate-spin text-[#00E5A0]" />
            </div>
          ) : (
            <>
              {/* Gauge visual */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <svg width="160" height="90" viewBox="0 0 160 90">
                    {/* Fondo arco */}
                    <path d="M 10 80 A 70 70 0 0 1 150 80"
                      fill="none" stroke="#1A1A1A" strokeWidth="14" strokeLinecap="round" />
                    {/* Arco de progreso */}
                    <path d="M 10 80 A 70 70 0 0 1 150 80"
                      fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
                      strokeDasharray={`${(score / 100) * 220} 220`}
                      style={{ transition: 'stroke-dasharray 0.8s ease' }}
                    />
                  </svg>
                  <div className="absolute inset-x-0 bottom-0 text-center pb-1">
                    <span className="text-4xl font-bold font-syne" style={{ color }}>{score.toFixed(1)}%</span>
                  </div>
                </div>
                <RiskBadge nivel={nivel} showScore={false} />
                <p className="text-[#555] text-xs font-dm mt-1">
                  Probabilidad de incumplimiento: <span style={{ color }}>{(score).toFixed(1)}%</span>
                </p>
              </div>

              {/* Factores de riesgo */}
              <div>
                <p className="text-[#888] text-xs font-dm font-medium uppercase tracking-wider mb-3">
                  Factores detectados por la IA
                </p>
                <div className="space-y-2">
                  {(detalle?.factores_riesgo || []).map((f, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-[#111] border border-[#1A1A1A] rounded-lg">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: `${color}20`, color }}>
                        {i + 1}
                      </div>
                      <span className="text-[#F0F0EB] text-sm font-dm">{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info financiera */}
              <div className="space-y-2">
                <p className="text-[#888] text-xs font-dm font-medium uppercase tracking-wider mb-3">
                  Resumen financiero
                </p>
                {[
                  { label: 'Saldo pendiente', val: socio.saldo_pendiente != null ? fmt(socio.saldo_pendiente) : '—', accent: true },
                  { label: 'Días en mora',    val: socio.dias_mora != null ? `${socio.dias_mora}d` : '—', accent: socio.dias_mora > 0 },
                  { label: 'Estado de mora',  val: { al_dia: 'Al día', mora_temprana: 'Mora temprana', mora_avanzada: 'Mora avanzada', cartera_vencida: 'Cartera vencida' }[socio.estado_mora] || socio.estado_mora || '—' },
                  { label: 'Tipo crédito',    val: socio.tipo_credito || '—' },
                ].map(({ label, val, accent }) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-[#111]">
                    <span className="text-[#555] text-sm font-dm">{label}</span>
                    <span className={`text-sm font-dm font-medium ${accent ? 'text-[#00E5A0]' : 'text-[#F0F0EB]'}`}>{val}</span>
                  </div>
                ))}
              </div>

              {/* Recomendación */}
              <div className="p-4 rounded-xl border" style={{ borderColor: `${recomendacion.color}30`, background: `${recomendacion.color}08` }}>
                <p className="text-xs font-dm font-medium uppercase tracking-wider mb-1" style={{ color: recomendacion.color }}>
                  Recomendación IA
                </p>
                <p className="font-syne font-bold text-[#F0F0EB] text-base">{recomendacion.texto}</p>
                <p className="text-[#888] text-xs font-dm mt-1">{recomendacion.desc}</p>
              </div>
            </>
          )}
        </div>

        {/* Footer — botón cobranza */}
        <div className="p-6 border-t border-[#1A1A1A] space-y-3">
          {cobranzaEstado === 'enviado' && (
            <div
              className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs font-dm"
              style={{ background: 'rgba(0,229,160,0.08)', border: '1px solid rgba(0,229,160,0.2)', color: '#00E5A0' }}
            >
              <CheckCircle size={14} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Mensaje de cobranza enviado a <strong>{socio.nombre_completo}</strong>
                <br />
                <span style={{ color: '#888' }}>Canal: Email</span>
              </span>
            </div>
          )}
          <button
            onClick={iniciarCobranza}
            disabled={cobranzaEstado === 'cargando' || cobranzaEstado === 'enviado'}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            {cobranzaEstado === 'cargando' ? (
              <><Loader2 size={15} className="animate-spin" aria-hidden="true" /> Enviando...</>
            ) : cobranzaEstado === 'enviado' ? (
              <><CheckCircle size={15} aria-hidden="true" /> Enviado ✓</>
            ) : (
              <><MessageSquare size={15} aria-hidden="true" /> Iniciar cobranza</>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  )
}

/* ══════════════════════════════════════════════
   PÁGINA PRINCIPAL — SOCIOS
══════════════════════════════════════════════ */
export default function Socios() {
  const [socios, setSocios] = useState([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [paginas, setPaginas] = useState(1)
  const [busqueda, setBusqueda] = useState('')
  const [filtroRiesgo, setFiltroRiesgo] = useState('')
  const [filtroMora, setFiltroMora] = useState('')
  const [cargando, setCargando] = useState(true)

  const [modalNuevo, setModalNuevo] = useState(false)
  const [modalCSV, setModalCSV] = useState(false)
  const [drawerSocio, setDrawerSocio] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const params = new URLSearchParams({ pagina, por_pagina: 15 })
      if (busqueda) params.set('busqueda', busqueda)
      if (filtroRiesgo) params.set('nivel_riesgo', filtroRiesgo)
      if (filtroMora) params.set('estado_mora', filtroMora)
      const { data } = await api.get(`/socios/?${params}`)
      setSocios(data.socios)
      setTotal(data.total)
      setPaginas(data.paginas)
    } catch { /* silencioso */ }
    finally { setCargando(false) }
  }, [busqueda, filtroRiesgo, filtroMora, pagina])

  useEffect(() => {
    const t = setTimeout(cargar, busqueda ? 400 : 0)
    return () => clearTimeout(t)
  }, [cargar])

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-syne text-[#F0F0EB]">Socios</h1>
          <p className="text-[#555] font-dm text-sm mt-0.5">
            <span className="text-[#00E5A0] font-semibold">{total}</span> socios registrados
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setModalCSV(true)}
            className="btn-ghost flex items-center gap-2 text-sm py-2">
            <Upload size={14} /> Importar CSV
          </button>
          <button onClick={() => setModalNuevo(true)}
            className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={14} /> Nuevo socio
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
            <input className="input pl-9 text-sm"
              placeholder="Buscar por nombre, cédula, email..."
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setPagina(1) }} />
          </div>
          <select className="input text-sm max-w-[180px]" value={filtroRiesgo}
            onChange={e => { setFiltroRiesgo(e.target.value); setPagina(1) }}>
            <option value="">Todos los riesgos</option>
            <option value="alto">Riesgo Alto</option>
            <option value="medio">Riesgo Medio</option>
            <option value="bajo">Riesgo Bajo</option>
          </select>
          <select className="input text-sm max-w-[200px]" value={filtroMora}
            onChange={e => { setFiltroMora(e.target.value); setPagina(1) }}>
            <option value="">Todos los estados</option>
            <option value="al_dia">Al día</option>
            <option value="mora_temprana">Mora temprana</option>
            <option value="mora_avanzada">Mora avanzada</option>
            <option value="cartera_vencida">Cartera vencida</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" role="grid" aria-label="Tabla de socios">
            <thead style={{ borderBottom: '1px solid var(--color-border)' }}>
              <tr>
                {['Socio', 'Ciudad', 'Score IA', 'Estado mora', 'Días mora', 'Saldo'].map(h => (
                  <th key={h} scope="col"
                    className="px-5 py-3.5 text-left text-xs font-medium font-dm"
                    style={{ color: 'var(--color-text-secondary)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            {cargando ? (
              <SkeletonTable rows={8} />
            ) : (
            <tbody>
              {socios.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-sm font-dm"
                    style={{ color: 'var(--color-text-secondary)' }}>
                    No se encontraron socios con los filtros aplicados
                  </td>
                </tr>
              ) : socios.map(s => (
                <tr
                  key={s.id}
                  className="transition-colors"
                  style={{ borderBottom: '1px solid #0E0E0E' }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
                  onMouseOut={e => e.currentTarget.style.background = ''}
                >
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-sm font-dm" style={{ color: 'var(--color-text-primary)' }}>{s.nombre_completo}</p>
                    <p className="text-xs font-dm" style={{ color: 'var(--color-text-secondary)' }}>{s.cedula} · {s.email}</p>
                  </td>
                  <td className="px-5 py-3.5 text-xs font-dm" style={{ color: 'var(--color-text-secondary)' }}>{s.ciudad}</td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => setDrawerSocio(s)}
                      className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
                      aria-label={`Ver análisis IA de ${s.nombre_completo}`}
                    >
                      <RiskBadge nivel={s.nivel_riesgo} score={s.score_riesgo} showScore />
                      <Brain size={11} aria-hidden="true" style={{ color: '#444' }} />
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-xs font-dm"
                    style={{
                      color: s.estado_mora === 'al_dia' ? 'var(--color-accent)' :
                             s.estado_mora === 'mora_temprana' ? 'var(--color-warning)' : 'var(--color-danger)'
                    }}>
                    {ESTADO_MORA_LABEL[s.estado_mora] || s.estado_mora}
                  </td>
                  <td className="px-5 py-3.5 text-sm font-dm font-semibold"
                    style={{
                      color: s.dias_mora > 30 ? 'var(--color-danger)' :
                             s.dias_mora > 0  ? 'var(--color-warning)' : '#555'
                    }}>
                    {s.dias_mora}d
                  </td>
                  <td className="px-5 py-3.5 text-sm font-syne font-semibold" style={{ color: 'var(--color-accent)' }}>
                    {fmt(s.saldo_pendiente)}
                  </td>
                </tr>
              ))}
            </tbody>
            )}
          </table>
        </div>

        {paginas > 1 && (
          <div className="px-5 py-3.5 flex items-center justify-between"
            style={{ borderTop: '1px solid var(--color-border)' }}>
            <span className="text-xs font-dm" style={{ color: 'var(--color-text-secondary)' }}>
              {total} socios en total
            </span>
            <div className="flex items-center gap-2" role="navigation" aria-label="Paginación">
              <button
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="p-1.5 transition-colors disabled:opacity-30"
                style={{ border: '1px solid var(--color-border)', borderRadius: 4, color: '#555' }}
                aria-label="Página anterior"
              >
                <ChevronLeft size={13} aria-hidden="true" />
              </button>
              <span className="text-xs font-dm px-2" style={{ color: 'var(--color-text-secondary)' }}
                aria-label={`Página ${pagina} de ${paginas}`}>
                {pagina} / {paginas}
              </span>
              <button
                onClick={() => setPagina(p => Math.min(paginas, p + 1))}
                disabled={pagina === paginas}
                className="p-1.5 transition-colors disabled:opacity-30"
                style={{ border: '1px solid var(--color-border)', borderRadius: 4, color: '#555' }}
                aria-label="Página siguiente"
              >
                <ChevronRight size={13} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modales */}
      {modalNuevo && (
        <ModalNuevoSocio
          onClose={() => setModalNuevo(false)}
          onCreado={() => { cargar(); setModalNuevo(false) }}
        />
      )}
      {modalCSV && (
        <ModalImportarCSV
          onClose={() => setModalCSV(false)}
          onImportado={cargar}
        />
      )}
      {drawerSocio && (
        <DrawerScoreIA
          socio={drawerSocio}
          onClose={() => setDrawerSocio(null)}
        />
      )}
    </div>
  )
}
