import { useState, useEffect, useCallback, useRef, useId } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Search, Plus, Upload, Download, ChevronLeft, ChevronRight,
  Brain, X, Loader2, CheckCircle, AlertTriangle, MessageSquare,
  ArrowLeft, Phone, Mail, Send, User, Paperclip, Bold, Italic, Underline, Pencil, Save,
  CalendarCheck, Check, Trash2, Clock, History, Sparkles,
} from 'lucide-react'
import RiskBadge from '../components/RiskBadge'
import { SkeletonTable } from '../components/Skeleton'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { useToast } from '../context/ToastContext'
import api from '../api/client'

/* ─── helpers ─── */
const fmt = (n) => {
  if (!n) return '$0'
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

const NIVEL_COLOR = { alto: '#FF4455', medio: '#FFB800', bajo: '#00FF6A' }

/* Badge pills para estado mora */
const MORA_BADGE = {
  al_dia:          { label: 'Al día',          bg: 'rgba(0,255,106,0.1)',  border: 'rgba(0,255,106,0.2)',  color: '#00FF6A' },
  mora_temprana:   { label: 'Mora temprana',   bg: 'rgba(255,184,0,0.1)',  border: 'rgba(255,184,0,0.2)',  color: '#FFB800' },
  mora_avanzada:   { label: 'Mora avanzada',   bg: 'rgba(255,68,85,0.1)',  border: 'rgba(255,68,85,0.2)',  color: '#FF4455' },
  cartera_vencida: { label: 'Cartera vencida', bg: 'rgba(255,68,85,0.15)', border: 'rgba(255,68,85,0.3)',  color: '#FF4455' },
}

/* Badge pills para acción recomendada */
const ACCION_BADGE = {
  alto:  { texto: 'Urgente ⚡', color: '#FF4455', bg: 'rgba(255,68,85,0.08)',  border: 'rgba(255,68,85,0.2)' },
  medio: { texto: 'Monitorear', color: '#FFB800', bg: 'rgba(255,184,0,0.08)',  border: 'rgba(255,184,0,0.2)' },
  bajo:  { texto: 'Al día ✓',  color: '#00FF6A', bg: 'rgba(0,255,106,0.08)', border: 'rgba(0,255,106,0.2)' },
}

const CSV_PLANTILLA = 'nombre,cedula,email,telefono,ciudad,tipo_credito,monto,dias_mora,historial_pagos\n' +
  'Carlos Martinez,1234567890,carlos@example.com,3001234567,Bogota,consumo,15000000,0,0.95\n' +
  'Maria Garcia,9876543210,maria@example.com,3109876543,Medellin,microcredito,5000000,10,0.80\n'

const MORA_LABEL = {
  al_dia: 'Al día', mora_temprana: 'Mora temprana',
  mora_avanzada: 'Mora avanzada', cartera_vencida: 'Cartera vencida',
}

/* Tipos de evento del Historial de Contexto */
const EVENTO_TIPOS = {
  pago:           { label: 'Pago',            color: '#00FF6A' },
  incumplimiento: { label: 'Incumplimiento',  color: '#FF4455' },
  promesa_pago:   { label: 'Promesa de pago', color: '#FFB800' },
  contacto:       { label: 'Contacto',        color: '#8A8F98' },
  novedad:        { label: 'Novedad',         color: '#5B8DEF' },
}

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
  const dialogRef = useFocusTrap(true)
  const errorId = useId()

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setCargando(true)
    try {
      const partes = form.nombre.trim().split(' ')
      const nombre = partes[0] || ''
      const apellido = partes.slice(1).join(' ') || 'N/A'
      const postData = {
        cedula: form.cedula, nombre, apellido,
        email: form.email, telefono: form.telefono || '0000000000', ciudad: form.ciudad,
        tipo_credito: form.tipo_credito,
        dias_mora: parseInt(form.dias_mora) || 0,
      }
      if (form.monto) postData.monto = parseFloat(form.monto)
      const { data: socioData } = await api.post('/socios/', postData)
      await api.post(`/prediccion/socio/${socioData.id}`)
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
      <div
        ref={dialogRef}
        role="dialog" aria-modal="true"
        aria-labelledby="modal-nuevo-socio-title"
        aria-describedby={error ? errorId : undefined}
        className="relative w-full max-w-lg animate-slide-up"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
      >
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <h2 id="modal-nuevo-socio-title" className="font-syne font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>Nuevo Socio</h2>
            <p className="text-xs font-dm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>El score IA se calcula automáticamente</p>
          </div>
          <button onClick={onClose} className="p-1 transition-colors" style={{ color: '#555' }} aria-label="Cerrar modal">
            <X size={17} aria-hidden="true" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
          <div>
            <label className="block text-xs text-[#888] font-dm mb-1.5">Nombre completo <span className="text-[#00FF6A]">*</span></label>
            <input className="input text-sm" placeholder="Carlos Andrés Martínez López" required value={form.nombre} onChange={e => set('nombre', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#888] font-dm mb-1.5">Cédula <span className="text-[#00FF6A]">*</span></label>
              <input className="input text-sm" placeholder="1234567890" required value={form.cedula} onChange={e => set('cedula', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-[#888] font-dm mb-1.5">Email <span className="text-[#00FF6A]">*</span></label>
              <input type="email" className="input text-sm" placeholder="correo@ejemplo.co" required value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-[#888] font-dm mb-1.5">Teléfono</label>
              <input className="input text-sm" placeholder="3001234567" value={form.telefono} onChange={e => set('telefono', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-[#888] font-dm mb-1.5">Ciudad</label>
              <input className="input text-sm" placeholder="Bogotá" value={form.ciudad} onChange={e => set('ciudad', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-[#888] font-dm mb-1.5">Tipo de crédito</label>
              <select className="input text-sm" value={form.tipo_credito} onChange={e => set('tipo_credito', e.target.value)}>
                <option value="microcredito">Microcrédito</option>
                <option value="consumo">Consumo</option>
                <option value="vivienda">Vivienda</option>
                <option value="empresarial">Empresarial</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#888] font-dm mb-1.5">Monto (COP)</label>
              <input type="number" className="input text-sm" placeholder="15000000" min="0" value={form.monto} onChange={e => set('monto', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-[#888] font-dm mb-1.5">Días en mora</label>
              <input type="number" className="input text-sm" min="0" value={form.dias_mora} onChange={e => set('dias_mora', e.target.value)} />
            </div>
          </div>
          {error && (
            <div id={errorId} className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-xs font-dm flex items-center gap-2">
              <AlertTriangle size={13} /> {error}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 text-sm py-2.5">Cancelar</button>
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
  const [estado, setEstado] = useState('idle')
  const [resultado, setResultado] = useState(null)

  const descargarPlantilla = () => {
    const blob = new Blob([CSV_PLANTILLA], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'plantilla_socios_wafeai.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (f && f.name.endsWith('.csv')) setArchivo(f)
  }

  const importar = async () => {
    if (!archivo) return
    setEstado('procesando'); setProgreso(10)
    const formData = new FormData()
    formData.append('archivo', archivo)
    try {
      const timer = setInterval(() => setProgreso(p => Math.min(p + 15, 85)), 300)
      const { data } = await api.post('/socios/importar-csv', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      clearInterval(timer); setProgreso(100); setResultado(data); setEstado('listo'); onImportado()
    } catch (err) {
      setEstado('error'); setResultado({ errores: [err.response?.data?.detail || 'Error al procesar el archivo'] })
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
            <button onClick={onClose} className="text-[#555] hover:text-[#F0F0EB] transition-colors p-1"><X size={18} /></button>
          )}
        </div>
        <div className="p-6 space-y-5">
          <button onClick={descargarPlantilla} className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-[#00FF6A]/30 bg-[#00FF6A]/5 hover:border-[#00FF6A]/60 transition-colors text-left">
            <Download size={16} className="text-[#00FF6A] flex-shrink-0" />
            <div>
              <p className="text-[#00FF6A] text-xs font-dm font-medium">Descargar plantilla CSV</p>
              <p className="text-[#555] text-xs font-dm">Formato exacto requerido</p>
            </div>
          </button>
          <div className="bg-[#141414] rounded-lg p-3">
            <p className="text-[#555] text-xs font-dm mb-2">Columnas requeridas:</p>
            <div className="flex flex-wrap gap-1.5">
              {['nombre','cedula','email','telefono','ciudad','tipo_credito','monto','dias_mora','historial_pagos'].map(c => (
                <span key={c} className="text-xs font-dm px-2 py-0.5 rounded bg-[#1A1A1A] text-[#888] border border-[#222]">{c}</span>
              ))}
            </div>
          </div>
          {estado === 'idle' && (
            <>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
              <button onClick={() => fileRef.current?.click()} className={`w-full p-6 rounded-xl border-2 border-dashed transition-all text-center ${archivo ? 'border-[#00FF6A]/60 bg-[#00FF6A]/5' : 'border-[#222] hover:border-[#333]'}`}>
                {archivo ? (<><CheckCircle size={24} className="text-[#00FF6A] mx-auto mb-2" /><p className="text-[#F0F0EB] text-sm font-dm font-medium">{archivo.name}</p><p className="text-[#555] text-xs font-dm mt-1">{(archivo.size / 1024).toFixed(1)} KB — clic para cambiar</p></>) : (<><Upload size={24} className="text-[#555] mx-auto mb-2" /><p className="text-[#888] text-sm font-dm">Clic para seleccionar archivo .csv</p></>)}
              </button>
              <div className="flex gap-3">
                <button onClick={onClose} className="btn-ghost flex-1 text-sm py-2.5">Cancelar</button>
                <button onClick={importar} disabled={!archivo} className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-2.5 disabled:opacity-40"><Upload size={14} /> Importar</button>
              </div>
            </>
          )}
          {estado === 'procesando' && (
            <div className="py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[#F0F0EB] text-sm font-dm">Importando socios...</p>
                <span className="text-[#00FF6A] text-sm font-syne font-bold">{progreso}%</span>
              </div>
              <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
                <div className="h-full bg-[#00FF6A] rounded-full transition-all duration-300" style={{ width: `${progreso}%` }} />
              </div>
              <p className="text-[#555] text-xs font-dm mt-2 text-center">No cierres esta ventana</p>
            </div>
          )}
          {estado === 'listo' && resultado && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#00FF6A]/10 border border-[#00FF6A]/20 rounded-xl p-4 text-center"><p className="text-3xl font-bold font-syne text-[#00FF6A]">{resultado.creados}</p><p className="text-xs text-[#888] font-dm mt-1">Importados</p></div>
                <div className="bg-[#141414] border border-[#222] rounded-xl p-4 text-center"><p className="text-3xl font-bold font-syne text-[#555]">{resultado.omitidos}</p><p className="text-xs text-[#888] font-dm mt-1">Duplicados</p></div>
              </div>
              {resultado.errores?.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 max-h-28 overflow-y-auto">
                  <p className="text-red-400 text-xs font-dm font-medium mb-1">Filas con error:</p>
                  {resultado.errores.map((e, i) => <p key={i} className="text-red-300/70 text-xs font-dm">{e}</p>)}
                </div>
              )}
              <button onClick={onClose} className="btn-primary w-full text-sm py-2.5">Cerrar</button>
            </div>
          )}
          {estado === 'error' && (
            <div className="space-y-3">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center"><AlertTriangle size={24} className="text-red-400 mx-auto mb-2" /><p className="text-red-400 text-sm font-dm">{resultado?.errores?.[0] || 'Error al importar'}</p></div>
              <button onClick={() => { setEstado('idle'); setArchivo(null) }} className="btn-ghost w-full text-sm py-2.5">Intentar de nuevo</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   DRAWER SCORE IA (sin cambios — sigue funcionando)
══════════════════════════════════════════════ */
function DrawerScoreIA({ socio, onClose }) {
  const [detalle, setDetalle] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [cobranzaEstado, setCobranzaEstado] = useState('idle')
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
      } finally { setCargando(false) }
    }
    cargar()
  }, [socio.id])

  const iniciarCobranza = async () => {
    if (!window.confirm('¿Enviar email de cobranza a ' + socio.nombre_completo + '?')) return
    setCobranzaEstado('cargando')
    try {
      await api.post('/cobranza/enviar-email', { socio_id: socio.id, plantilla: socio.dias_mora > 30 ? 'mora_urgente' : 'recordatorio_pago' })
      setCobranzaEstado('enviado')
      timerRef.current = setTimeout(() => setCobranzaEstado('idle'), 3000)
    } catch { setCobranzaEstado('idle') }
  }

  const score = detalle?.score_riesgo ?? socio.score_riesgo
  const nivel = detalle?.nivel_riesgo ?? socio.nivel_riesgo
  const color = NIVEL_COLOR[nivel] || '#00FF6A'
  const recomendacion = {
    alto:  { texto: 'Contacto urgente', desc: 'Llamar al socio hoy. Iniciar proceso formal de cobranza.', color: '#EF4444' },
    medio: { texto: 'Monitorear', desc: 'Enviar recordatorio preventivo. Revisar en 15 días.', color: '#F59E0B' },
    bajo:  { texto: 'Sin acción', desc: 'Perfil saludable. Seguimiento periódico estándar.', color: '#00FF6A' },
  }[nivel] || {}

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="drawer-socio-title"
        className="fixed right-0 top-0 h-full w-96 z-50 flex flex-col"
        style={{ background: '#0A0A0A', borderLeft: '1px solid var(--color-border)', boxShadow: '0 0 40px rgba(0,0,0,0.6)', animation: 'slideInRight 0.25s ease-out' }}>
        <div className="flex items-start justify-between p-6 border-b border-[#1A1A1A]">
          <div>
            <h2 id="drawer-socio-title" className="font-syne font-bold" style={{ color: 'var(--color-text-primary)' }}>{socio.nombre_completo}</h2>
            <p className="text-[#555] text-xs font-dm mt-0.5">CC {socio.cedula} · {socio.ciudad}</p>
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-[#F0F0EB] transition-colors p-1 mt-0.5"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {cargando ? (
            <div className="flex items-center justify-center h-48"><Loader2 size={28} className="animate-spin text-[#00FF6A]" /></div>
          ) : (
            <>
              <div className="flex flex-col items-center">
                <div className="relative">
                  <svg width="160" height="90" viewBox="0 0 160 90">
                    <path d="M 10 80 A 70 70 0 0 1 150 80" fill="none" stroke="#1A1A1A" strokeWidth="14" strokeLinecap="round" />
                    <path d="M 10 80 A 70 70 0 0 1 150 80" fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
                      strokeDasharray={`${(score / 100) * 220} 220`} style={{ transition: 'stroke-dasharray 0.8s ease' }} />
                  </svg>
                  <div className="absolute inset-x-0 bottom-0 text-center pb-1">
                    <span className="text-4xl font-bold font-syne" style={{ color }}>{score.toFixed(1)}%</span>
                  </div>
                </div>
                <RiskBadge nivel={nivel} showScore={false} />
                <p className="text-[#555] text-xs font-dm mt-1">Probabilidad de incumplimiento: <span style={{ color }}>{score.toFixed(1)}%</span></p>
              </div>
              <div>
                <p className="text-[#888] text-xs font-dm font-medium uppercase tracking-wider mb-3">Factores detectados por la IA</p>
                <div className="space-y-2">
                  {(detalle?.factores_riesgo || []).map((f, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-[#111] border border-[#1A1A1A] rounded-lg">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: `${color}20`, color }}>{i + 1}</div>
                      <span className="text-[#F0F0EB] text-sm font-dm">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[#888] text-xs font-dm font-medium uppercase tracking-wider mb-3">Resumen financiero</p>
                {[
                  { label: 'Saldo pendiente', val: socio.saldo_pendiente != null ? fmt(socio.saldo_pendiente) : '—', accent: true },
                  { label: 'Días en mora', val: socio.dias_mora != null ? `${socio.dias_mora}d` : '—', accent: socio.dias_mora > 0 },
                  { label: 'Estado de mora', val: MORA_LABEL[socio.estado_mora] || socio.estado_mora || '—' },
                  { label: 'Tipo crédito', val: socio.tipo_credito || '—' },
                ].map(({ label, val, accent }) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-[#111]">
                    <span className="text-[#555] text-sm font-dm">{label}</span>
                    <span className={`text-sm font-dm font-medium ${accent ? 'text-[#00FF6A]' : 'text-[#F0F0EB]'}`}>{val}</span>
                  </div>
                ))}
              </div>
              <div className="p-4 rounded-xl border" style={{ borderColor: `${recomendacion.color}30`, background: `${recomendacion.color}08` }}>
                <p className="text-xs font-dm font-medium uppercase tracking-wider mb-1" style={{ color: recomendacion.color }}>Recomendación IA</p>
                <p className="font-syne font-bold text-[#F0F0EB] text-base">{recomendacion.texto}</p>
                <p className="text-[#888] text-xs font-dm mt-1">{recomendacion.desc}</p>
              </div>
            </>
          )}
        </div>
        <div className="p-6 border-t border-[#1A1A1A] space-y-3">
          {cobranzaEstado === 'enviado' && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs font-dm" style={{ background: 'rgba(0,255,106,0.08)', border: '1px solid rgba(0,255,106,0.2)', color: '#00FF6A' }}>
              <CheckCircle size={14} className="flex-shrink-0 mt-0.5" /><span>Cobranza enviada a <strong>{socio.nombre_completo}</strong><br /><span style={{ color: '#888' }}>Canal: Email</span></span>
            </div>
          )}
          <button onClick={iniciarCobranza} disabled={cobranzaEstado === 'cargando' || cobranzaEstado === 'enviado'} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
            {cobranzaEstado === 'cargando' ? <><Loader2 size={15} className="animate-spin" /> Enviando...</> : cobranzaEstado === 'enviado' ? <><CheckCircle size={15} /> Enviado ✓</> : <><MessageSquare size={15} /> Iniciar cobranza</>}
          </button>
        </div>
      </div>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </>
  )
}

/* ══════════════════════════════════════════════
   CHAT WHATSAPP DEL SOCIO
══════════════════════════════════════════════ */
function ChatWhatsApp({ socio, mensajeInicial = '', chatInputRef = null, highlighted = false, historialEventos = [], perfilRiesgo = {} }) {
  const toast = useToast()
  const [modoIA, setModoIA] = useState(true)
  const [mensaje, setMensaje] = useState(mensajeInicial)
  const [historial, setHistorial] = useState([])
  const [sugerenciaSeleccionada, setSugerenciaSeleccionada] = useState(-1)

  const [panelIAAbierto, setPanelIAAbierto] = useState(false)
  const [cargandoSugerenciaIA, setCargandoSugerenciaIA] = useState(false)
  const [sugerenciaIA, setSugerenciaIA] = useState('')
  const [errorSugerenciaIA, setErrorSugerenciaIA] = useState(null)

  const generarSugerenciaIA = async () => {
    setPanelIAAbierto(true)
    setCargandoSugerenciaIA(true)
    setErrorSugerenciaIA(null)
    try {
      const { data } = await api.post('/generar-mensaje', {
        socio_id: socio.id,
        historial: historialEventos.map(ev => ({ fecha: ev.fecha, tipo: ev.tipo, descripcion: ev.descripcion })),
        perfil: perfilRiesgo,
      })
      setSugerenciaIA(data.mensaje || '')
    } catch (err) {
      setErrorSugerenciaIA(err.response?.data?.detail || 'Error al generar la sugerencia')
    } finally {
      setCargandoSugerenciaIA(false)
    }
  }

  const usarSugerenciaIA = () => {
    setMensaje(sugerenciaIA)
    setPanelIAAbierto(false)
    if (textareaRef.current) { textareaRef.current.focus(); ajustarAltura(textareaRef.current) }
  }

  const copiarSugerenciaIA = async () => {
    try {
      await navigator.clipboard.writeText(sugerenciaIA)
      toast.success('Mensaje copiado al portapapeles ✓')
    } catch {
      toast.error('No se pudo copiar el mensaje')
    }
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`wafeai_chat_${socio.id}`)
      if (saved) setHistorial(JSON.parse(saved))
    } catch {}
  }, [socio.id])

  useEffect(() => {
    try {
      if (historial.length > 0)
        localStorage.setItem(`wafeai_chat_${socio.id}`, JSON.stringify(historial.slice(-50)))
    } catch {}
  }, [historial, socio.id])

  const [mensajesPersonalizados, setMensajesPersonalizados] = useState([])
  const [formAbierto, setFormAbierto] = useState(false)
  const [formNombre, setFormNombre] = useState('')
  const [formTexto, setFormTexto] = useState('')
  const [dotActivo, setDotActivo] = useState(0)
  const [puedeScrollIzq, setPuedeScrollIzq] = useState(false)
  const [puedeScrollDer, setPuedeScrollDer] = useState(true)
  const [animandoIndex, setAnimandoIndex] = useState(null)
  const [flechaPresionada, setFlechaPresionada] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const historialRef = useRef(null)
  const textareaRef = useRef(null)
  const carouselRef = useRef(null)

  const primerNombre = (socio.nombre_completo || '').split(' ')[0]
  const saldoFmt = fmt(socio.saldo_pendiente)
  const tipoCredito = socio.tipo_credito || 'crédito'
  const tienetelefono = !!(socio.telefono && socio.telefono !== '0000000000')
  const partes = (socio.nombre_completo || '').split(' ')
  const inics = `${partes[0]?.[0] || ''}${partes[1]?.[0] || ''}`.toUpperCase() || 'S'

  const fechaLimite = (() => {
    const d = new Date(); d.setDate(d.getDate() + 3)
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })
  })()

  const sugerencias = ({
    al_dia: [
      { icono: '💬', label: 'Recordatorio',    texto: `Hola ${primerNombre}, desde WafeAI te recordamos que tu cuota de ${tipoCredito} vence pronto. ¿Podemos ayudarte con algo? 😊` },
      { icono: '⭐', label: 'Agradecimiento',  texto: `Buenos días ${primerNombre}, queremos reconocer tu excelente historial de pagos. Gracias por tu confianza.` },
      { icono: '🤝', label: 'Beneficio',       texto: `Hola ${primerNombre}, tienes disponible un beneficio especial por buen comportamiento crediticio. ¿Te interesa conocerlo?` },
    ],
    mora_temprana: [
      { icono: '⚠️', label: 'Atraso',          texto: `Hola ${primerNombre}, notamos que tienes ${socio.dias_mora} días de atraso en tu crédito. ¿Hubo algún inconveniente? Podemos ayudarte.` },
      { icono: '💬', label: 'Saldo pendiente', texto: `Buenos días ${primerNombre}, tienes un saldo pendiente de ${saldoFmt}. Comunícate con nosotros para coordinar tu pago.` },
      { icono: '🤝', label: 'Acuerdo',         texto: `Hola ${primerNombre}, queremos ayudarte a regularizar tu situación antes de que genere mayores intereses. ¿Cuándo podemos hablar?` },
    ],
    mora_avanzada: [
      { icono: '⚠️', label: 'Urgente',         texto: `Hola ${primerNombre}, tu cuenta presenta ${socio.dias_mora} días en mora por ${saldoFmt}. Comunícate HOY para evitar consecuencias mayores. ☎️` },
      { icono: '💬', label: 'Refinanciamiento',texto: `Estimado/a ${primerNombre}, su obligación de ${tipoCredito} requiere atención inmediata. Tenemos opciones de refinanciamiento disponibles.` },
      { icono: '🚨', label: 'Escalado',        texto: `Hola ${primerNombre}, su caso fue escalado. Contáctenos antes del ${fechaLimite} para evitar reportes a centrales de riesgo.` },
    ],
    cartera_vencida: [
      { icono: '⚠️', label: 'Urgente',         texto: `Hola ${primerNombre}, tu cuenta presenta ${socio.dias_mora} días en mora por ${saldoFmt}. Comunícate HOY para evitar consecuencias mayores. ☎️` },
      { icono: '💬', label: 'Refinanciamiento',texto: `Estimado/a ${primerNombre}, su obligación de ${tipoCredito} requiere atención inmediata. Tenemos opciones de refinanciamiento disponibles.` },
      { icono: '🚨', label: 'Escalado',        texto: `Hola ${primerNombre}, su caso fue escalado. Contáctenos antes del ${fechaLimite} para evitar reportes a centrales de riesgo.` },
    ],
  })[socio.estado_mora] || [
    { icono: '💬', label: 'Recordatorio',   texto: `Hola ${primerNombre}, desde WafeAI te recordamos que tu cuota de ${tipoCredito} vence pronto. ¿Podemos ayudarte con algo? 😊` },
    { icono: '⭐', label: 'Agradecimiento', texto: `Buenos días ${primerNombre}, queremos reconocer tu excelente historial de pagos. Gracias por tu confianza.` },
    { icono: '🤝', label: 'Beneficio',      texto: `Hola ${primerNombre}, tienes disponible un beneficio especial por buen comportamiento crediticio. ¿Te interesa conocerlo?` },
  ]

  const personalizadasFmt = mensajesPersonalizados.map(m => ({ icono: m.icono || '✏️', label: m.nombre, texto: m.texto }))
  const todasLasSugerencias = [...personalizadasFmt, ...(modoIA ? sugerencias : [])]

  useEffect(() => {
    if (mensajeInicial && textareaRef.current) ajustarAltura(textareaRef.current)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`wafeai_mensajes_${socio.id}`)
      if (saved) setMensajesPersonalizados(JSON.parse(saved))
    } catch {}
  }, [socio.id])

  useEffect(() => {
    setSugerenciaSeleccionada(-1)
    setDotActivo(0)
    setPuedeScrollIzq(false)
    if (carouselRef.current) {
      carouselRef.current.scrollLeft = 0
      requestAnimationFrame(() => {
        if (carouselRef.current)
          setPuedeScrollDer(carouselRef.current.scrollWidth > carouselRef.current.clientWidth + 4)
      })
    }
  }, [modoIA])

  useEffect(() => {
    if (historialRef.current) historialRef.current.scrollTop = historialRef.current.scrollHeight
  }, [historial])

  const ajustarAltura = (t) => {
    t.style.height = 'auto'
    t.style.height = Math.min(t.scrollHeight, 96) + 'px'
  }

  const sustituirVariables = useCallback((texto) => {
    return texto
      .replace(/\[nombre\]/gi, primerNombre)
      .replace(/\[saldo\]/gi, saldoFmt)
      .replace(/\[dias_mora\]/gi, String(socio.dias_mora ?? 0))
      .replace(/\[tipo_credito\]/gi, tipoCredito)
      .replace(/\[fecha\]/gi, fechaLimite)
  }, [primerNombre, saldoFmt, socio.dias_mora, tipoCredito, fechaLimite])

  const seleccionarSugerencia = (texto, idx) => {
    const textoFinal = sustituirVariables(texto)
    setSugerenciaSeleccionada(idx)
    setMensaje(textoFinal)
    if (textareaRef.current) { textareaRef.current.focus(); ajustarAltura(textareaRef.current) }
  }

  const guardarMensajePersonalizado = () => {
    if (!formTexto.trim()) return
    const nuevo = { icono: '✏️', nombre: formNombre.trim() || 'Personalizado', texto: formTexto.trim() }
    const nuevos = [nuevo, ...mensajesPersonalizados]
    setMensajesPersonalizados(nuevos)
    try { localStorage.setItem(`wafeai_mensajes_${socio.id}`, JSON.stringify(nuevos)) } catch {}
    setFormNombre('')
    setFormTexto('')
    setFormAbierto(false)
    toast.success('Mensaje guardado')
  }

  const onScrollCarousel = () => {
    if (!carouselRef.current) return
    const el = carouselRef.current
    setPuedeScrollIzq(el.scrollLeft > 4)
    setPuedeScrollDer(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
    const idx = Math.round(el.scrollLeft / 208)
    setDotActivo(Math.min(idx, Math.max(0, todasLasSugerencias.length - 1)))
  }

  const scrollCarrusel = (dir) => {
    const el = carouselRef.current
    if (!el) return
    const nuevoIndex = Math.round((el.scrollLeft + dir * 208) / 208)
    el.scrollBy({ left: dir * 208, behavior: 'smooth' })
    setAnimandoIndex(nuevoIndex)
    setFlechaPresionada(dir === -1 ? 'izq' : 'der')
    setTimeout(() => setAnimandoIndex(null), 350)
    setTimeout(() => setFlechaPresionada(null), 200)
  }

  const enviar = async () => {
    if (!mensaje.trim() || !tienetelefono || enviando) return
    const texto = mensaje.trim()
    const hora = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    setMensaje('')
    setSugerenciaSeleccionada(-1)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setEnviando(true)
    try {
      await api.post('/cobranza/enviar-whatsapp', {
        socio_id: socio.id,
        mensaje_personalizado: texto,
      })
      setHistorial(prev => [...prev, { texto, hora, enviado: true }])
      toast.success('Mensaje enviado por WhatsApp ✓')
    } catch {
      toast.error('Error al enviar el mensaje')
    } finally {
      setEnviando(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
  }

  return (
    <div
      style={{
        background: '#0F0F0F', border: '1px solid #1A1A1A', borderRadius: 10,
        display: 'flex', flexDirection: 'column',
        height: 'calc(100vh - 240px)', minHeight: 520, overflow: 'hidden',
        boxShadow: highlighted ? '0 0 0 1.5px #00FF6A, 0 0 24px rgba(0,255,106,0.15)' : 'none',
        transition: 'box-shadow 300ms ease',
      }}
    >
      {/* Chat header */}
      <div style={{ background: '#0D0D0D', borderBottom: '1px solid #1A1A1A', padding: '12px 16px', flexShrink: 0 }}>
        <div className="flex items-center gap-3">
          <div
            className="flex-shrink-0 flex items-center justify-center font-syne font-bold"
            style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,255,106,0.15)', color: '#00FF6A', fontSize: 12, border: '1px solid rgba(0,255,106,0.25)' }}
            aria-hidden="true"
          >
            {inics}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-dm font-semibold truncate" style={{ color: 'var(--color-text-primary)', fontSize: 13 }}>
              {socio.nombre_completo}
            </p>
            <p className="font-dm" style={{ color: modoIA ? '#00FF6A' : '#555', fontSize: 10, marginTop: 1 }}>
              {modoIA ? '● Sugerencias activas' : '● Modo manual'}
            </p>
          </div>
          {/* Toggle iOS */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="font-dm" style={{ fontSize: 11, color: !modoIA ? 'var(--color-text-primary)' : '#444' }}>Humano</span>
            <button
              role="switch"
              aria-checked={modoIA}
              aria-label={modoIA ? 'Cambiar a modo humano' : 'Cambiar a modo IA'}
              onClick={() => setModoIA(m => !m)}
              style={{
                position: 'relative', width: 40, height: 22, borderRadius: 11,
                background: modoIA ? '#00FF6A' : '#333', border: 'none', cursor: 'pointer',
                transition: 'background 0.2s ease', flexShrink: 0, padding: 0,
              }}
            >
              <span style={{
                position: 'absolute', top: 3, left: modoIA ? 21 : 3,
                width: 16, height: 16, borderRadius: 8, background: '#fff',
                transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
              }} />
            </button>
            <span className="font-dm" style={{ fontSize: 11, color: modoIA ? '#00FF6A' : '#444' }}>IA</span>
          </div>
        </div>
      </div>

      {/* Área de mensajes */}
      <div
        ref={historialRef}
        className="overflow-y-auto"
        style={{ flex: 1, background: '#080808', padding: 16 }}
        aria-label="Historial de mensajes"
        aria-live="polite"
      >
        {!tienetelefono && (
          <div
            className="flex items-center gap-2 px-3 py-2.5 mb-3 text-xs font-dm"
            style={{ background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.2)', borderRadius: 6, color: '#FFB800' }}
            role="alert"
          >
            ⚠️ Sin teléfono — no se puede enviar por WhatsApp
          </div>
        )}
        {historial.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center" style={{ minHeight: 120 }}>
            <MessageSquare size={28} style={{ color: '#1E1E1E' }} aria-hidden="true" />
            <p className="font-dm mt-3" style={{ color: '#333', fontSize: 13 }}>
              Envía tu primer mensaje a {primerNombre}
            </p>
          </div>
        ) : historial.map((m, i) => (
          <div key={i} className="flex justify-end mb-3 last:mb-0">
            <div style={{ maxWidth: '85%' }}>
              <div
                className="font-dm text-xs leading-relaxed"
                style={{
                  background: 'rgba(0,255,106,0.15)', border: '1px solid rgba(0,255,106,0.25)',
                  borderRadius: '12px 12px 2px 12px', padding: '8px 12px',
                  color: 'var(--color-text-primary)',
                }}
              >
                {m.texto}
              </div>
              <p className="text-right mt-1 font-dm" style={{ color: '#444', fontSize: 10 }}>
                Enviado por WhatsApp ✓ · {m.hora}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Sugerencia WafeAI: mensaje generado con IA a partir del historial de contexto ── */}
      <div style={{ borderTop: '1px solid #111', background: '#0A0A0A', flexShrink: 0, padding: '10px 12px' }}>
        <button
          onClick={generarSugerenciaIA}
          disabled={cargandoSugerenciaIA}
          className="w-full flex items-center justify-center gap-2 font-dm text-xs disabled:opacity-60"
          style={{
            background: 'rgba(91,141,239,0.08)', border: '1px solid rgba(91,141,239,0.25)',
            borderRadius: 8, padding: '8px 12px', color: '#8AB4FF',
            cursor: cargandoSugerenciaIA ? 'not-allowed' : 'pointer', transition: 'background 150ms ease',
          }}
        >
          <Sparkles size={13} aria-hidden="true" /> Generar mensaje con WafeAI
        </button>

        {panelIAAbierto && (
          <div className="mt-2 p-3" style={{ background: 'rgba(91,141,239,0.04)', border: '1px solid rgba(91,141,239,0.15)', borderRadius: 8 }}>
            {cargandoSugerenciaIA ? (
              <div className="flex items-center justify-center gap-2 py-4 font-dm" style={{ color: '#8AB4FF', fontSize: 12 }}>
                <Loader2 size={15} className="animate-spin" aria-hidden="true" /> Generando mensaje con IA...
              </div>
            ) : errorSugerenciaIA ? (
              <div className="flex items-center gap-2 py-1 font-dm text-xs" style={{ color: '#FF4455' }}>
                <AlertTriangle size={12} aria-hidden="true" /> {errorSugerenciaIA}
              </div>
            ) : (
              <>
                <textarea
                  value={sugerenciaIA}
                  onChange={e => setSugerenciaIA(e.target.value)}
                  rows={3}
                  className="font-dm resize-none w-full"
                  style={{
                    background: '#0F0F0F', border: '1px solid #222', borderRadius: 6,
                    padding: '6px 10px', fontSize: 12, color: '#F0F0EB', outline: 'none',
                  }}
                  aria-label="Mensaje sugerido por WafeAI (editable)"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setPanelIAAbierto(false)}
                    className="font-dm"
                    style={{ border: '1px solid #2A2A2A', borderRadius: 6, padding: '5px 12px', fontSize: 12, color: '#555', background: 'transparent', cursor: 'pointer' }}
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    onClick={copiarSugerenciaIA}
                    disabled={!sugerenciaIA.trim()}
                    className="flex items-center gap-1.5 font-dm disabled:opacity-40"
                    style={{
                      background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.3)',
                      borderRadius: 6, padding: '5px 12px', fontSize: 12, color: '#25D366',
                      cursor: sugerenciaIA.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    <MessageSquare size={11} aria-hidden="true" /> Copiar para WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={usarSugerenciaIA}
                    disabled={!sugerenciaIA.trim()}
                    className="font-dm disabled:opacity-40"
                    style={{
                      background: 'rgba(0,255,106,0.12)', border: '1px solid rgba(0,255,106,0.3)',
                      borderRadius: 6, padding: '5px 12px', fontSize: 12, color: '#00FF6A',
                      cursor: sugerenciaIA.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Usar mensaje
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Carrusel de sugerencias + form personalizado ── */}
      <div style={{ borderTop: '1px solid #111', background: '#0A0A0A', flexShrink: 0 }}>

        {/* Header label */}
        {todasLasSugerencias.length > 0 && (
          <div style={{ padding: '10px 12px 6px' }}>
            <span className="font-dm" style={{ color: '#444', fontSize: 11 }}>
              {modoIA ? '💡 Sugerencias IA' : '📝 Guardados'}
            </span>
          </div>
        )}

        {/* Cards con flechas laterales */}
        {todasLasSugerencias.length > 0 && (
          <>
            <style>{`.wa-scroll::-webkit-scrollbar{display:none}`}</style>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px 6px' }}>

              {/* Flecha izquierda */}
              <button
                onClick={() => scrollCarrusel(-1)}
                disabled={!puedeScrollIzq}
                aria-label="Anterior sugerencia"
                style={{
                  flexShrink: 0, width: 30, height: 30, borderRadius: '50%',
                  background: flechaPresionada === 'izq' ? 'rgba(0,255,106,0.1)' : '#1A1A1A',
                  border: '1px solid #2A2A2A',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#888', cursor: puedeScrollIzq ? 'pointer' : 'not-allowed',
                  opacity: puedeScrollIzq ? 1 : 0.2,
                  transform: flechaPresionada === 'izq' ? 'scale(0.85)' : 'scale(1)',
                  transition: 'transform 120ms ease, background 120ms ease, opacity 150ms ease',
                }}
                onMouseOver={e => { if (puedeScrollIzq && flechaPresionada !== 'izq') { e.currentTarget.style.background = '#222'; e.currentTarget.style.borderColor = 'rgba(0,255,106,0.3)'; e.currentTarget.style.color = '#00FF6A' } }}
                onMouseOut={e => { if (flechaPresionada !== 'izq') { e.currentTarget.style.background = '#1A1A1A'; e.currentTarget.style.borderColor = '#2A2A2A'; e.currentTarget.style.color = '#888' } }}
              >
                <ChevronLeft size={14} aria-hidden="true" />
              </button>

              {/* Carrusel con fade en bordes */}
              <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                {puedeScrollIzq && (
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, width: 28, zIndex: 1,
                    background: 'linear-gradient(to right, #0F0F0F, transparent)',
                    pointerEvents: 'none',
                  }} />
                )}
                {puedeScrollDer && (
                  <div style={{
                    position: 'absolute', right: 0, top: 0, bottom: 0, width: 28, zIndex: 1,
                    background: 'linear-gradient(to left, #0F0F0F, transparent)',
                    pointerEvents: 'none',
                  }} />
                )}
                <div
                  ref={carouselRef}
                  className="wa-scroll"
                  onScroll={onScrollCarousel}
                  onWheel={e => { e.preventDefault(); carouselRef.current?.scrollBy({ left: e.deltaY * 2, behavior: 'smooth' }) }}
                  style={{
                    display: 'flex', gap: 8,
                    overflowX: 'auto', scrollbarWidth: 'none',
                    scrollSnapType: 'x mandatory',
                  }}
                >
                  {todasLasSugerencias.map((s, i) => {
                    const sel = sugerenciaSeleccionada === i
                    const animando = animandoIndex === i
                    return (
                      <button
                        key={i}
                        onClick={() => seleccionarSugerencia(s.texto, i)}
                        className="font-dm text-left"
                        style={{
                          width: 200, flexShrink: 0, scrollSnapAlign: 'start',
                          background: sel ? 'rgba(0,255,106,0.05)' : '#111',
                          border: `1px solid ${sel ? '#00FF6A' : '#222'}`,
                          borderRadius: 10, padding: '10px 12px',
                          cursor: 'pointer', position: 'relative',
                          transform: animando ? 'scale(1.03)' : 'scale(1)',
                          boxShadow: animando ? '0 0 0 1.5px #00FF6A, 0 4px 20px rgba(0,255,106,0.12)' : 'none',
                          zIndex: animando ? 2 : 1,
                          transition: 'transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 250ms ease, border-color 150ms, background 150ms',
                        }}
                        onMouseOver={e => { if (!sel) { e.currentTarget.style.borderColor = 'rgba(0,255,106,0.5)'; e.currentTarget.style.background = 'rgba(0,255,106,0.05)' } }}
                        onMouseOut={e => { if (!sel) { e.currentTarget.style.borderColor = '#222'; e.currentTarget.style.background = '#111' } }}
                      >
                        {sel && (
                          <span style={{ position: 'absolute', top: 6, right: 8, color: '#00FF6A', fontSize: 10, fontWeight: 700 }}>✓</span>
                        )}
                        <div className="flex items-center" style={{ gap: 5, marginBottom: 5 }}>
                          <span style={{ fontSize: 13, lineHeight: 1 }}>{s.icono}</span>
                          <span className="font-dm" style={{ color: '#555', fontSize: 10 }}>{s.label}</span>
                        </div>
                        <p style={{
                          color: '#F0F0EB', fontSize: 12, lineHeight: '1.5', margin: '0 0 8px 0',
                          display: '-webkit-box', WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {s.texto}
                        </p>
                        <span className="font-dm" style={{ color: '#00FF6A', fontSize: 10 }}>Toca para usar →</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Flecha derecha */}
              <button
                onClick={() => scrollCarrusel(1)}
                disabled={!puedeScrollDer}
                aria-label="Siguiente sugerencia"
                style={{
                  flexShrink: 0, width: 30, height: 30, borderRadius: '50%',
                  background: flechaPresionada === 'der' ? 'rgba(0,255,106,0.1)' : '#1A1A1A',
                  border: '1px solid #2A2A2A',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#888', cursor: puedeScrollDer ? 'pointer' : 'not-allowed',
                  opacity: puedeScrollDer ? 1 : 0.2,
                  transform: flechaPresionada === 'der' ? 'scale(0.85)' : 'scale(1)',
                  transition: 'transform 120ms ease, background 120ms ease, opacity 150ms ease',
                }}
                onMouseOver={e => { if (puedeScrollDer && flechaPresionada !== 'der') { e.currentTarget.style.background = '#222'; e.currentTarget.style.borderColor = 'rgba(0,255,106,0.3)'; e.currentTarget.style.color = '#00FF6A' } }}
                onMouseOut={e => { if (flechaPresionada !== 'der') { e.currentTarget.style.background = '#1A1A1A'; e.currentTarget.style.borderColor = '#2A2A2A'; e.currentTarget.style.color = '#888' } }}
              >
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            </div>

            {/* Dots — clickeables, sincronizados */}
            {todasLasSugerencias.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 5, paddingBottom: 8 }}>
                {todasLasSugerencias.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { carouselRef.current?.scrollTo({ left: i * 208, behavior: 'smooth' }); setDotActivo(i) }}
                    aria-label={`Ir a sugerencia ${i + 1}`}
                    style={{
                      width: i === dotActivo ? 16 : 6, height: 6, borderRadius: 3,
                      background: i === dotActivo ? '#00FF6A' : '#2A2A2A',
                      border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
                      transition: 'all 200ms ease',
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Separator */}
        <div className="flex items-center" style={{ gap: 8, padding: '6px 12px 8px' }}>
          <div style={{ flex: 1, height: 1, background: '#161616' }} />
          <span className="font-dm" style={{ color: '#333', fontSize: 11, whiteSpace: 'nowrap' }}>
            — o escribe uno personalizado —
          </span>
          <div style={{ flex: 1, height: 1, background: '#161616' }} />
        </div>

        {/* Custom message button / form */}
        {!formAbierto ? (
          <div style={{ padding: '0 12px 12px' }}>
            <button
              onClick={() => setFormAbierto(true)}
              className="font-dm w-full"
              style={{
                border: '1px dashed #2A2A2A', borderRadius: 8,
                padding: '7px 12px', fontSize: 12,
                color: '#444', background: 'transparent', cursor: 'pointer',
                textAlign: 'left', transition: 'border-color 150ms, color 150ms',
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(0,255,106,0.4)'; e.currentTarget.style.color = '#00FF6A' }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#2A2A2A'; e.currentTarget.style.color = '#444' }}
            >
              + Guardar mensaje personalizado
            </button>
          </div>
        ) : (
          <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
            <input
              value={formNombre}
              onChange={e => setFormNombre(e.target.value)}
              placeholder="Nombre (ej: Recordatorio amigable)"
              className="font-dm"
              style={{
                background: '#0F0F0F', border: '1px solid #222', borderRadius: 6,
                padding: '6px 10px', fontSize: 12, color: '#F0F0EB', outline: 'none', width: '100%',
              }}
            />
            <textarea
              value={formTexto}
              onChange={e => setFormTexto(e.target.value)}
              placeholder="Mensaje… usa [nombre], [saldo], [dias_mora], [tipo_credito], [fecha]"
              rows={2}
              className="font-dm resize-none"
              style={{
                background: '#0F0F0F', border: '1px solid #222', borderRadius: 6,
                padding: '6px 10px', fontSize: 12, color: '#F0F0EB', outline: 'none', width: '100%',
              }}
            />
            <div className="flex justify-end" style={{ gap: 8 }}>
              <button
                onClick={() => { setFormAbierto(false); setFormNombre(''); setFormTexto('') }}
                className="font-dm"
                style={{
                  border: '1px solid #2A2A2A', borderRadius: 6, padding: '5px 12px',
                  fontSize: 12, color: '#555', background: 'transparent', cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={guardarMensajePersonalizado}
                disabled={!formTexto.trim()}
                className="font-dm disabled:opacity-40"
                style={{
                  background: 'rgba(0,255,106,0.12)', border: '1px solid rgba(0,255,106,0.3)',
                  borderRadius: 6, padding: '5px 12px', fontSize: 12,
                  color: '#00FF6A', cursor: formTexto.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div style={{ background: '#0D0D0D', borderTop: '1px solid #1A1A1A', padding: '10px 12px', flexShrink: 0 }}>
        <div className="flex items-end gap-3">
          <textarea
            ref={el => { textareaRef.current = el; if (chatInputRef) chatInputRef.current = el }}
            value={mensaje}
            onChange={e => { setMensaje(e.target.value.slice(0, 1000)); ajustarAltura(e.target) }}
            onKeyDown={handleKeyDown}
            placeholder={tienetelefono ? 'Escribe un mensaje...' : 'Sin teléfono registrado'}
            disabled={!tienetelefono}
            rows={1}
            className="font-dm text-sm resize-none flex-1"
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: tienetelefono ? 'var(--color-text-primary)' : '#444',
              padding: '4px 0', minHeight: 24, maxHeight: 96, lineHeight: '1.5',
              cursor: tienetelefono ? 'text' : 'not-allowed',
            }}
            aria-label="Mensaje para WhatsApp"
          />
          <button
            onClick={enviar}
            disabled={!mensaje.trim() || !tienetelefono || enviando}
            className="flex-shrink-0 flex items-center justify-center transition-all disabled:opacity-40"
            style={{
              width: 36, height: 36, borderRadius: '50%', border: 'none',
              background: mensaje.trim() && tienetelefono && !enviando ? '#25D366' : '#1A1A1A',
              cursor: mensaje.trim() && tienetelefono && !enviando ? 'pointer' : 'not-allowed',
              transition: 'background 0.15s ease',
            }}
            aria-label="Enviar por WhatsApp"
          >
            {enviando
              ? <Loader2 size={15} style={{ color: '#fff' }} className="animate-spin" aria-hidden="true" />
              : <Send size={15} style={{ color: '#fff' }} aria-hidden="true" />
            }
          </button>
        </div>
        <div className="flex justify-end mt-1">
          <span className="font-dm" style={{ fontSize: 10, color: mensaje.length > 900 ? '#FFB800' : '#333' }}>
            {mensaje.length}/1000
          </span>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   MODAL CORREO DE COBRANZA
══════════════════════════════════════════════ */
function ModalCorreo({ socio, onClose, onEnviado }) {
  const toast = useToast()

  const primerNombre = (socio.nombre_completo || '').split(' ')[0]
  const saldoFmt = socio.saldo_pendiente != null
    ? Number(socio.saldo_pendiente).toLocaleString('es-CO')
    : '0'
  const tipoCredito = socio.tipo_credito || 'crédito'
  const diasMora = socio.dias_mora || 0

  const addDays = (n) => {
    const d = new Date()
    d.setDate(d.getDate() + n)
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })
  }

  const avanzadas = [
    {
      label: 'Notificación formal',
      asunto: 'URGENTE: Tu crédito requiere atención inmediata',
      cuerpo: `Estimado/a ${primerNombre},\n\nPor medio del presente correo, le informamos que su obligación de ${tipoCredito} presenta un atraso de ${diasMora} días con un saldo pendiente de $${saldoFmt} COP.\n\nLe solicitamos respetuosamente ponerse en contacto con nosotros antes del ${addDays(5)} para acordar una solución.\n\nDe no recibir respuesta, nos veremos en la obligación de escalar el caso a las instancias correspondientes.\n\nAtentamente,\nDepartamento de Cobranza\nWafeAI`,
    },
    {
      label: 'Oferta de refinanciamiento',
      asunto: `Refinancia tu deuda antes del ${addDays(7)}`,
      cuerpo: `Estimado/a ${primerNombre},\n\nComo parte de nuestro compromiso con nuestros socios, le ofrecemos la posibilidad de refinanciar su deuda de ${tipoCredito} bajo condiciones especiales.\n\nEsta oferta está disponible únicamente hasta el ${addDays(7)}. Contáctenos para conocer los detalles y formalizar el proceso.\n\nAtentamente,\nDepartamento de Cobranza\nWafeAI`,
    },
    {
      label: 'Aviso pre-jurídico',
      asunto: 'Aviso importante sobre su obligación crediticia',
      cuerpo: `Estimado/a ${primerNombre},\n\nLe comunicamos que su obligación de ${tipoCredito} con saldo pendiente de $${saldoFmt} COP se encuentra en un estado que requiere atención inmediata.\n\nEn cumplimiento de nuestros procedimientos internos, le notificamos que de no regularizarse la situación, el caso será remitido al departamento jurídico.\n\nLe instamos a comunicarse con nosotros a la mayor brevedad posible.\n\nAtentamente,\nDepartamento de Cobranza\nWafeAI`,
    },
  ]

  const PLANTILLAS_MAP = {
    al_dia: [
      {
        label: 'Recordatorio amigable',
        asunto: 'Tu cuota se acerca — Cooperativa',
        cuerpo: `Hola ${primerNombre},\n\nEsperamos que estés muy bien. Te escribimos para recordarte que tu cuota de ${tipoCredito} tiene fecha próxima de vencimiento.\n\nSi ya realizaste el pago, ignora este mensaje. De lo contrario, recuerda que puedes hacerlo a través de nuestros canales habituales.\n\nCualquier inquietud, estamos para ayudarte.\n\nAtentamente,\nEquipo de Cartera\nWafeAI`,
      },
      {
        label: 'Fidelización',
        asunto: `¡Gracias por tu puntualidad, ${primerNombre}!`,
        cuerpo: `Hola ${primerNombre},\n\nQueremos tomarnos un momento para agradecerte tu excelente comportamiento crediticio. Tu puntualidad y responsabilidad son un ejemplo para nuestra comunidad.\n\nRecuerda que manteniendo este historial, puedes acceder a condiciones preferenciales en futuros créditos.\n\nGracias por tu confianza en WafeAI.\n\nAtentamente,\nEquipo de Cartera\nWafeAI`,
      },
      {
        label: 'Beneficio especial',
        asunto: 'Tienes un beneficio disponible por buen historial',
        cuerpo: `Hola ${primerNombre},\n\nPor tu excelente historial de pagos, hemos identificado que eres candidato/a a un beneficio especial disponible para nuestros mejores socios.\n\nComunícate con nosotros para conocer los detalles. ¡Esta oportunidad es exclusiva para ti!\n\nAtentamente,\nEquipo de Cartera\nWafeAI`,
      },
    ],
    mora_temprana: [
      {
        label: 'Recordatorio de pago',
        asunto: `Tienes ${diasMora} días de atraso — actúa hoy`,
        cuerpo: `Hola ${primerNombre},\n\nHemos notado que tu crédito de ${tipoCredito} presenta ${diasMora} días de atraso. Entendemos que pueden surgir imprevistos y queremos ayudarte.\n\nPor favor comunícate con nosotros a la brevedad para regularizar tu situación antes de que genere cargos adicionales.\n\nEstamos disponibles para encontrar la mejor solución juntos.\n\nAtentamente,\nEquipo de Cartera\nWafeAI`,
      },
      {
        label: 'Acuerdo de pago',
        asunto: 'Propuesta de acuerdo para tu crédito',
        cuerpo: `Hola ${primerNombre},\n\nQueremos ofrecerte la posibilidad de llegar a un acuerdo de pago flexible para regularizar tu crédito de ${tipoCredito}.\n\nContáctanos antes del ${addDays(5)} y exploraremos opciones ajustadas a tu situación actual.\n\nNo dejes que la mora siga acumulando — podemos ayudarte.\n\nAtentamente,\nEquipo de Cartera\nWafeAI`,
      },
      {
        label: 'Último aviso amable',
        asunto: 'Evita cargos adicionales en tu crédito',
        cuerpo: `Hola ${primerNombre},\n\nEste es un recordatorio amable sobre el estado de tu crédito. Tienes la oportunidad de ponerte al día antes de que se generen cargos adicionales.\n\nComunícate con nosotros hoy para encontrar una solución rápida.\n\nAtentamente,\nEquipo de Cartera\nWafeAI`,
      },
    ],
    mora_avanzada: avanzadas,
    cartera_vencida: avanzadas,
  }

  const plantillas = PLANTILLAS_MAP[socio.estado_mora] || PLANTILLAS_MAP.al_dia

  const [plantillaIdx, setPlantillaIdx] = useState(0)
  const [asunto, setAsunto] = useState(plantillas[0].asunto)
  const [cuerpo, setCuerpo] = useState(plantillas[0].cuerpo)
  const [cc, setCc] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const dialogRef = useFocusTrap(true)

  const aplicarFormato = (abre, cierra) => {
    const ta = document.getElementById('modal-correo-body')
    if (!ta) return
    const start = ta.selectionStart, end = ta.selectionEnd
    const sel = cuerpo.substring(start, end)
    const nuevo = cuerpo.substring(0, start) + abre + sel + cierra + cuerpo.substring(end)
    setCuerpo(nuevo)
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + abre.length, end + abre.length) }, 0)
  }

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const seleccionarPlantilla = (idx) => {
    setPlantillaIdx(idx)
    setAsunto(plantillas[idx].asunto)
    setCuerpo(plantillas[idx].cuerpo)
  }

  const enviar = async () => {
    setEnviando(true)
    setError(null)
    try {
      await api.post('/cobranza/enviar-email', {
        socio_id: socio.id,
        plantilla: diasMora > 30 ? 'mora_urgente' : 'recordatorio_pago',
        asunto_custom: asunto,
        cuerpo_html_custom: cuerpo,
        cc: cc ? [cc] : [],
      })
      toast.success(`Correo enviado a ${socio.email || socio.nombre_completo} ✓`)
      onEnviado()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al enviar el correo')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-correo-title"
        className="relative w-full max-w-2xl animate-slide-up"
        style={{
          background: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: 12,
          boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #1A1A1A', flexShrink: 0 }}>
          <div className="flex items-center gap-3">
            <Mail size={18} style={{ color: '#00FF6A' }} aria-hidden="true" />
            <div>
              <h2 id="modal-correo-title" className="font-syne font-bold" style={{ color: 'var(--color-text-primary)', fontSize: 15 }}>
                Nuevo correo de cobranza
              </h2>
              <p className="font-dm" style={{ color: '#555', fontSize: 11 }}>WafeAI · Canal Email</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 transition-colors"
            style={{ color: '#555' }}
            aria-label="Cerrar modal"
            onMouseOver={e => e.currentTarget.style.color = 'var(--color-text-primary)'}
            onMouseOut={e => e.currentTarget.style.color = '#555'}
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>

        {/* Cuerpo scrolleable */}
        <div className="flex-1 overflow-y-auto">
          {/* Campos estilo cliente email */}
          <div>
            <div className="flex items-center px-6 py-3" style={{ borderBottom: '1px solid #111' }}>
              <span className="font-dm text-xs flex-shrink-0" style={{ color: '#555', width: 60 }}>Para:</span>
              {socio.email ? (
                <span
                  className="inline-flex items-center gap-1.5 font-dm text-xs px-2 py-1"
                  style={{ background: 'rgba(0,255,106,0.08)', border: '1px solid rgba(0,255,106,0.2)', borderRadius: 4, color: '#00FF6A' }}
                >
                  <User size={10} aria-hidden="true" /> {socio.email}
                </span>
              ) : (
                <span className="font-dm text-xs" style={{ color: '#FF4455' }}>Sin email registrado</span>
              )}
            </div>
            <div className="flex items-center px-6 py-3" style={{ borderBottom: '1px solid #111' }}>
              <span className="font-dm text-xs flex-shrink-0" style={{ color: '#555', width: 60 }}>De:</span>
              <span className="font-dm text-xs" style={{ color: '#555' }}>notificaciones@wafeai.co</span>
            </div>
            <div className="flex items-center px-6 py-3" style={{ borderBottom: '1px solid #111' }}>
              <span className="font-dm text-xs flex-shrink-0" style={{ color: '#555', width: 60 }}>Asunto:</span>
              <input
                value={asunto}
                onChange={e => setAsunto(e.target.value)}
                className="flex-1 font-dm text-sm bg-transparent border-none outline-none"
                style={{ color: 'var(--color-text-primary)' }}
                placeholder="Asunto del correo..."
              />
            </div>
            <div className="flex items-center px-6 py-3" style={{ borderBottom: '1px solid #1A1A1A' }}>
              <span className="font-dm text-xs flex-shrink-0" style={{ color: '#555', width: 60 }}>CC:</span>
              <input
                value={cc}
                onChange={e => setCc(e.target.value)}
                className="flex-1 font-dm text-sm bg-transparent border-none outline-none"
                style={{ color: 'var(--color-text-primary)' }}
                placeholder="Agregar copia..."
              />
            </div>
          </div>

          {/* Chips de plantilla */}
          <div className="flex items-center gap-3 px-6 py-3" style={{ borderBottom: '1px solid #1A1A1A' }}>
            <span className="font-dm text-xs flex-shrink-0" style={{ color: '#555' }}>Plantilla:</span>
            <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {plantillas.map((p, i) => (
                <button
                  key={i}
                  onClick={() => seleccionarPlantilla(i)}
                  className="font-dm text-xs px-3 py-1.5 flex-shrink-0 transition-all"
                  style={{
                    background: plantillaIdx === i ? 'rgba(0,255,106,0.1)' : '#111',
                    border: `1px solid ${plantillaIdx === i ? 'rgba(0,255,106,0.35)' : '#1A1A1A'}`,
                    borderRadius: 6,
                    color: plantillaIdx === i ? '#00FF6A' : '#888',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toolbar de formato */}
          <div className="flex items-center gap-1 px-6 py-2" style={{ borderBottom: '1px solid #1A1A1A' }}>
            {[
              { Icon: Bold,      label: 'Negrita',  abre: '**',   cierra: '**'   },
              { Icon: Italic,    label: 'Cursiva',  abre: '_',    cierra: '_'    },
              { Icon: Underline, label: 'Subrayar', abre: '<u>',  cierra: '</u>' },
            ].map(({ Icon, label, abre, cierra }) => (
              <button
                key={label}
                aria-label={label}
                onClick={() => aplicarFormato(abre, cierra)}
                className="flex items-center justify-center transition-colors"
                style={{ width: 28, height: 28, background: '#111', border: '1px solid #1A1A1A', borderRadius: 4, color: '#666' }}
                onMouseOver={e => e.currentTarget.style.color = '#999'}
                onMouseOut={e => e.currentTarget.style.color = '#666'}
              >
                <Icon size={12} aria-hidden="true" />
              </button>
            ))}
            <div style={{ width: 1, height: 16, background: '#222', margin: '0 4px' }} aria-hidden="true" />
            <button
              aria-label="Adjuntar archivo"
              title="Próximamente"
              disabled
              className="flex items-center justify-center"
              style={{ width: 28, height: 28, background: '#111', border: '1px solid #1A1A1A', borderRadius: 4, color: '#333', cursor: 'not-allowed' }}
            >
              <Paperclip size={12} aria-hidden="true" />
            </button>
          </div>

          {/* Editor del cuerpo */}
          <div className="px-6 py-4">
            <textarea
              id="modal-correo-body"
              value={cuerpo}
              onChange={e => setCuerpo(e.target.value.slice(0, 2000))}
              rows={10}
              className="w-full font-dm resize-none"
              style={{
                background: '#0D0D0D', border: '1px solid #1A1A1A', borderRadius: 8,
                color: '#E0E0E0', lineHeight: 1.7, padding: '14px 16px',
                outline: 'none', fontSize: 14,
              }}
              placeholder="Redacta el cuerpo del correo..."
            />
          </div>

          {error && (
            <div
              className="mx-6 mb-4 flex items-center gap-2 px-4 py-3 rounded-lg text-xs font-dm"
              style={{ background: 'rgba(255,68,85,0.08)', border: '1px solid rgba(255,68,85,0.2)', color: '#FF6B7A' }}
            >
              <AlertTriangle size={13} aria-hidden="true" /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderTop: '1px solid #1A1A1A', flexShrink: 0 }}
        >
          <span className="font-dm" style={{ color: '#555', fontSize: 11 }}>{cuerpo.length} / 2000 caracteres</span>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-ghost text-sm py-2 px-4">Cancelar</button>
            <button
              onClick={enviar}
              disabled={enviando || !socio.email}
              className="btn-primary flex items-center gap-2 text-sm py-2 px-4 disabled:opacity-50"
            >
              {enviando ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Send size={14} aria-hidden="true" />}
              {enviando ? 'Enviando...' : 'Enviar correo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   MODAL EDITAR SOCIO
══════════════════════════════════════════════ */
function ModalEditarSocio({ socio, onClose, onGuardado }) {
  const toast = useToast()
  const focusRef = useFocusTrap(true)
  const [form, setForm] = useState({
    nombre:   socio.nombre   || '',
    apellido: socio.apellido || '',
    email:    socio.email    || '',
    telefono: socio.telefono || '',
    ciudad:   socio.ciudad   || '',
  })
  const [guardando, setGuardando] = useState(false)
  const [errores, setErrores] = useState({})

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrores(p => ({ ...p, [k]: null })) }

  const validar = () => {
    const e = {}
    if (!form.nombre.trim())   e.nombre   = 'Requerido'
    if (!form.apellido.trim()) e.apellido = 'Requerido'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido'
    return e
  }

  const guardar = async (e) => {
    e.preventDefault()
    const e2 = validar()
    if (Object.keys(e2).length) { setErrores(e2); return }
    setGuardando(true)
    try {
      const payload = {}
      if (form.nombre.trim()   !== socio.nombre)   payload.nombre   = form.nombre.trim()
      if (form.apellido.trim() !== socio.apellido) payload.apellido = form.apellido.trim()
      if (form.email.trim()    !== socio.email)    payload.email    = form.email.trim()
      if (form.telefono.trim() !== socio.telefono) payload.telefono = form.telefono.trim()
      if (form.ciudad.trim()   !== socio.ciudad)   payload.ciudad   = form.ciudad.trim()
      if (Object.keys(payload).length === 0) { onClose(); return }
      const { data } = await api.patch(`/socios/${socio.id}`, payload)
      toast.success('Perfil actualizado correctamente')
      onGuardado(data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al guardar los cambios')
    } finally {
      setGuardando(false)
    }
  }

  const campo = (label, key, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs font-dm mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
        {label} {['nombre','apellido'].includes(key) && <span style={{ color: 'var(--color-accent)' }}>*</span>}
      </label>
      <input
        type={type}
        className="input text-sm"
        style={errores[key] ? { borderColor: 'rgba(255,68,85,0.5)' } : {}}
        placeholder={placeholder}
        value={form[key]}
        onChange={e => set(key, e.target.value)}
      />
      {errores[key] && <p className="text-xs font-dm mt-1" style={{ color: 'var(--color-danger)' }}>{errores[key]}</p>}
    </div>
  )

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 50 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={focusRef}
        className="w-full max-w-lg"
        style={{ background: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: 12, boxShadow: '0 16px 48px rgba(0,0,0,0.7)' }}
        role="dialog"
        aria-modal="true"
        aria-label="Editar perfil del socio"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #1A1A1A' }}>
          <div className="flex items-center gap-2">
            <Pencil size={14} style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
            <h2 className="font-syne font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
              Editar perfil — {socio.nombre_completo}
            </h2>
          </div>
          <button onClick={onClose} className="transition-colors" style={{ color: '#555' }}
            onMouseOver={e => e.currentTarget.style.color = 'var(--color-text-primary)'}
            onMouseOut={e => e.currentTarget.style.color = '#555'}
            aria-label="Cerrar">
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={guardar} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {campo('Nombre', 'nombre', 'text', 'Juan')}
            {campo('Apellido', 'apellido', 'text', 'García')}
          </div>
          {campo('Email', 'email', 'email', 'ejemplo@correo.com')}
          <div className="grid grid-cols-2 gap-4">
            {campo('Teléfono', 'telefono', 'tel', '3100000000')}
            {campo('Ciudad', 'ciudad', 'text', 'Bogotá')}
          </div>

          {/* Cédula — solo lectura */}
          <div>
            <label className="block text-xs font-dm mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Cédula</label>
            <input className="input text-sm" value={socio.cedula} readOnly
              style={{ color: '#555', cursor: 'not-allowed' }} />
            <p className="text-xs font-dm mt-1" style={{ color: '#444' }}>La cédula no se puede modificar</p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost text-sm py-2 px-4">Cancelar</button>
            <button type="submit" disabled={guardando} className="btn-primary flex items-center gap-2 text-sm py-2 px-4">
              {guardando ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Save size={13} aria-hidden="true" />}
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   HISTORIAL DE CONTEXTO — línea de tiempo de eventos del socio
══════════════════════════════════════════════ */
function HistorialContexto({ eventos, onAgregar, onEliminar }) {
  const toast = useToast()
  const [formAbierto, setFormAbierto] = useState(false)
  const [tipo, setTipo] = useState('contacto')
  const [descripcion, setDescripcion] = useState('')
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0])
  const [guardando, setGuardando] = useState(false)

  const agregarEvento = async (e) => {
    e.preventDefault()
    if (!descripcion.trim() || !fecha) return
    setGuardando(true)
    try {
      await onAgregar({ tipo, descripcion: descripcion.trim(), fecha })
      setDescripcion('')
      setTipo('contacto')
      setFecha(new Date().toISOString().split('T')[0])
      setFormAbierto(false)
    } catch {
      toast.error('Error al registrar el evento')
    } finally {
      setGuardando(false)
    }
  }

  const eliminarEvento = async (id) => {
    try { await onEliminar(id) } catch { toast.error('Error al eliminar el evento') }
  }

  const eventosOrdenados = [...eventos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))

  return (
    <div style={{ background: '#0F0F0F', border: '1px solid #1A1A1A', borderRadius: 10, padding: 20 }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History size={14} style={{ color: '#5B8DEF' }} aria-hidden="true" />
          <span className="font-syne font-bold" style={{ color: 'var(--color-text-primary)', fontSize: 13, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Historial de Contexto
          </span>
        </div>
        <button
          onClick={() => setFormAbierto(v => !v)}
          className="flex items-center gap-1 font-dm text-xs px-2.5 py-1 transition-all"
          style={{ background: formAbierto ? 'rgba(0,255,106,0.1)' : '#111', border: '1px solid #2A2A2A', borderRadius: 6, color: formAbierto ? '#00FF6A' : '#666' }}
        >
          <Plus size={11} aria-hidden="true" /> Nuevo evento
        </button>
      </div>

      {formAbierto && (
        <form
          onSubmit={agregarEvento}
          className="mb-4 p-3 space-y-2"
          style={{ background: 'rgba(91,141,239,0.04)', border: '1px solid rgba(91,141,239,0.15)', borderRadius: 8 }}
        >
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-dm mb-1" style={{ color: '#555' }}>Tipo de evento</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)} className="input text-sm w-full" style={{ fontSize: 13 }}>
                {Object.entries(EVENTO_TIPOS).map(([key, v]) => (
                  <option key={key} value={key}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-dm mb-1" style={{ color: '#555' }}>Fecha</label>
              <input
                type="date" required
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="input text-sm w-full"
                style={{ fontSize: 13 }}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-dm mb-1" style={{ color: '#555' }}>Descripción</label>
            <input
              type="text" required maxLength={200}
              placeholder="ej. Llamó para pedir plazo adicional"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              className="input text-sm w-full"
              style={{ fontSize: 13 }}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setFormAbierto(false)} className="btn-ghost text-xs px-3 py-1.5">Cancelar</button>
            <button type="submit" disabled={!descripcion.trim() || guardando} className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5">
              {guardando ? <Loader2 size={11} className="animate-spin" aria-hidden="true" /> : <Check size={11} aria-hidden="true" />}
              Agregar
            </button>
          </div>
        </form>
      )}

      {eventosOrdenados.length === 0 ? (
        <p className="font-dm text-sm text-center py-4" style={{ color: '#444' }}>
          Sin eventos registrados. Agrega pagos, incumplimientos, promesas, contactos o novedades.
        </p>
      ) : (
        <div>
          {eventosOrdenados.map((ev, i) => {
            const meta = EVENTO_TIPOS[ev.tipo] || EVENTO_TIPOS.novedad
            const esUltimo = i === eventosOrdenados.length - 1
            const fechaFmt = new Date(ev.fecha + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
            return (
              <div key={ev.id} className="flex gap-3" style={{ paddingBottom: esUltimo ? 0 : 16 }}>
                <div className="flex flex-col items-center flex-shrink-0" style={{ width: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: meta.color, boxShadow: `0 0 0 3px ${meta.color}22`, flexShrink: 0 }} />
                  {!esUltimo && <div style={{ width: 2, flex: 1, background: '#1A1A1A', marginTop: 4 }} />}
                </div>
                <div className="flex-1 min-w-0 group" style={{ paddingBottom: 2 }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-dm font-medium" style={{ color: meta.color, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {meta.label}
                      </span>
                      <span className="font-dm" style={{ color: '#444', fontSize: 11 }}>{fechaFmt}</span>
                    </div>
                    <button
                      onClick={() => eliminarEvento(ev.id)}
                      title="Eliminar evento"
                      className="flex items-center justify-center flex-shrink-0 transition-opacity opacity-0 group-hover:opacity-100"
                      style={{ width: 20, height: 20, borderRadius: 4, border: '1px solid #222', background: 'transparent', color: '#444' }}
                    >
                      <Trash2 size={10} aria-hidden="true" />
                    </button>
                  </div>
                  <p className="font-dm mt-1" style={{ color: 'var(--color-text-primary)', fontSize: 13 }}>{ev.descripcion}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════
   PANTALLA COMPLETA DEL SOCIO
══════════════════════════════════════════════ */
function SocioDetalle({ socio: socioProp, onVolver, onSocioActualizado, mensajeInicial = '' }) {
  const [socio, setSocio] = useState(socioProp)
  const toast = useToast()
  const [detalle, setDetalle] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [chatHighlight, setChatHighlight] = useState(false)
  const [modalCorreo, setModalCorreo] = useState(false)
  const [modalEditar, setModalEditar] = useState(false)
  const chatInputRef = useRef(null)

  const [promesas, setPromesas] = useState([])
  const [formPromesa, setFormPromesa] = useState(false)
  const [promesaForm, setPromesaForm] = useState({ monto: '', fecha: '', nota: '' })
  const [guardandoPromesa, setGuardandoPromesa] = useState(false)

  const [eventosHistorial, setEventosHistorial] = useState([])

  const cargarHistorial = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/historial/?socio_id=${socio.id}`)
      setEventosHistorial(data)
    } catch {}
  }, [socio.id])

  useEffect(() => { cargarHistorial() }, [cargarHistorial])

  const agregarEventoHistorial = async (evento) => {
    const { data } = await api.post('/api/historial/', { socio_id: socio.id, ...evento })
    setEventosHistorial(prev => [data, ...prev])
  }

  const eliminarEventoHistorial = async (id) => {
    await api.delete(`/api/historial/${id}`)
    setEventosHistorial(prev => prev.filter(e => e.id !== id))
  }

  const cargarPromesas = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/promesas/?socio_id=${socio.id}`)
      setPromesas(data)
    } catch {}
  }, [socio.id])

  useEffect(() => { cargarPromesas() }, [cargarPromesas])

  useEffect(() => {
    window.scrollTo(0, 0)
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
      } finally { setCargando(false) }
    }
    cargar()
  }, [socio.id])

  const score = detalle?.score_riesgo ?? socio.score_riesgo ?? 0
  const nivel = detalle?.nivel_riesgo ?? socio.nivel_riesgo ?? 'bajo'
  const color = NIVEL_COLOR[nivel] || '#00FF6A'
  const recomendacion = {
    alto:  { texto: 'Contacto urgente', desc: 'Llamar al socio hoy. Iniciar proceso formal de cobranza antes de que la mora avance.', color: '#EF4444' },
    medio: { texto: 'Monitorear de cerca', desc: 'Enviar recordatorio preventivo. Revisar en los próximos 15 días.', color: '#F59E0B' },
    bajo:  { texto: 'Sin acción necesaria', desc: 'Perfil saludable. Seguimiento periódico estándar es suficiente.', color: '#00FF6A' },
  }[nivel] || {}

  const partes = (socio.nombre_completo || '').split(' ')
  const inics = `${partes[0]?.[0] || ''}${partes[1]?.[0] || ''}`.toUpperCase() || 'S'
  const moraBadge = MORA_BADGE[socio.estado_mora] || MORA_BADGE.al_dia
  const diasColor = socio.dias_mora > 30 ? '#FF4455' : socio.dias_mora > 0 ? '#FFB800' : '#555'

  /* helpers locales */
  const cs = { background: '#0F0F0F', border: '1px solid #1A1A1A', borderRadius: 10, padding: 20 }
  const secTitle = (label, IconComp) => (
    <div className="flex items-center gap-2 mb-4">
      {IconComp && <IconComp size={13} style={{ color: '#555' }} aria-hidden="true" />}
      <span className="font-syne" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#555', fontWeight: 600, whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div aria-hidden="true" style={{ flex: 1, height: 1, background: '#1A1A1A' }} />
    </div>
  )

  return (
    <div className="animate-fade-in">

      {/* ── Header bar ── */}
      <div
        className="flex items-center gap-3"
        style={{ background: 'rgba(10,10,10,0.92)', borderBottom: '1px solid #1A1A1A', padding: '14px 24px', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(8px)' }}
      >
        <button onClick={onVolver} className="btn-ghost flex items-center gap-1.5 text-xs py-1.5 px-3 flex-shrink-0">
          <ArrowLeft size={12} aria-hidden="true" /> Socios
        </button>
        <div className="flex items-center gap-1.5 flex-1 min-w-0 text-xs font-dm" style={{ color: '#555' }}>
          <span>Socios</span>
          <span aria-hidden="true">/</span>
          <span className="truncate" style={{ color: 'var(--color-text-primary)' }}>{socio.nombre_completo}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <RiskBadge nivel={nivel} score={score} showScore />
          <button
            onClick={() => setModalEditar(true)}
            className="flex items-center gap-1.5 text-xs font-dm py-1.5 px-3 transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #2A2A2A', color: '#888', borderRadius: 6 }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--color-text-primary)' }}
            onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#888' }}
          >
            <Pencil size={11} aria-hidden="true" /> Editar
          </button>
          <button
            onClick={() => {
              if (socio.telefono && socio.telefono !== '0000000000') window.open(`tel:${socio.telefono}`, '_self')
              else toast.error('Sin teléfono registrado')
            }}
            className="flex items-center gap-1.5 text-xs font-dm py-1.5 px-3 transition-all"
            style={{ background: 'rgba(0,255,106,0.06)', border: '1px solid rgba(0,255,106,0.15)', color: '#00FF6A', borderRadius: 6 }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(0,255,106,0.12)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(0,255,106,0.06)'}
          >
            <Phone size={12} aria-hidden="true" /> Llamar
          </button>
          <button
            onClick={() => {
              const tel = socio.telefono?.replace(/\D/g, '')
              if (tel && tel !== '0000000000') {
                const waNum = tel.startsWith('57') ? tel : `57${tel}`
                window.open(`https://wa.me/${waNum}`, '_blank')
              } else toast.error('Sin teléfono registrado')
            }}
            className="flex items-center gap-1.5 text-xs font-dm py-1.5 px-3 transition-all"
            style={{ background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.15)', color: '#25D366', borderRadius: 6 }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(37,211,102,0.12)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(37,211,102,0.06)'}
          >
            <MessageSquare size={12} aria-hidden="true" /> WhatsApp
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5">

        {/* ── Hero ── */}
        <div
          className="flex flex-wrap items-center gap-6 p-5"
          style={{ background: 'linear-gradient(135deg, #0F0F0F 0%, #111 100%)', border: '1px solid #1A1A1A', borderRadius: 10 }}
        >
          {/* Avatar + datos */}
          <div className="flex items-center gap-4 flex-1 min-w-0" style={{ minWidth: 220 }}>
            <div
              className="flex-shrink-0 flex items-center justify-center font-syne font-bold"
              style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,255,106,0.15)', color: '#00FF6A', fontSize: 22, border: '2px solid rgba(0,255,106,0.3)' }}
              aria-hidden="true"
            >
              {inics}
            </div>
            <div className="min-w-0">
              <h1 className="font-syne font-bold truncate" style={{ color: 'var(--color-text-primary)', fontSize: 22 }}>
                {socio.nombre_completo}
              </h1>
              <p className="font-dm mt-0.5" style={{ color: '#555', fontSize: 12 }}>CC {socio.cedula} · {socio.ciudad}</p>
              <div className="flex flex-wrap gap-3 mt-1.5 font-dm" style={{ color: '#555', fontSize: 11 }}>
                {socio.email && <span className="flex items-center gap-1"><Mail size={10} aria-hidden="true" /> {socio.email}</span>}
                {socio.telefono && socio.telefono !== '0000000000' && <span className="flex items-center gap-1"><Phone size={10} aria-hidden="true" /> {socio.telefono}</span>}
              </div>
            </div>
          </div>

          {/* 3 métricas */}
          <div className="flex items-stretch" style={{ borderLeft: '1px solid #1A1A1A', borderRight: '1px solid #1A1A1A' }}>
            {[
              { label: 'Saldo', val: fmt(socio.saldo_pendiente), valColor: '#00FF6A', isBadge: false },
              { label: 'Días mora', val: `${socio.dias_mora}d`, valColor: diasColor, isBadge: false },
              { label: 'Estado', isBadge: true },
            ].map((m, i, arr) => (
              <div
                key={m.label}
                className="flex flex-col justify-center text-center"
                style={{ padding: '8px 22px', borderRight: i < arr.length - 1 ? '1px solid #1A1A1A' : 'none', minWidth: 90 }}
              >
                <p className="font-dm" style={{ color: '#555', fontSize: 11 }}>{m.label}</p>
                {m.isBadge ? (
                  <span
                    className="font-dm mt-1.5 inline-block px-2 py-0.5"
                    style={{ background: moraBadge.bg, border: `1px solid ${moraBadge.border}`, borderRadius: 4, color: moraBadge.color, fontSize: 11 }}
                  >
                    {moraBadge.label}
                  </span>
                ) : (
                  <p className="font-syne font-bold mt-1" style={{ color: m.valColor, fontSize: 16 }}>{m.val}</p>
                )}
              </div>
            ))}
          </div>

          {/* Gauge pequeño */}
          <div className="flex flex-col items-center flex-shrink-0">
            {cargando ? (
              <div className="flex items-center justify-center" style={{ width: 140, height: 78 }}>
                <Loader2 size={22} className="animate-spin" style={{ color: '#00FF6A' }} />
              </div>
            ) : (
              <>
                <div className="relative">
                  <svg width="140" height="78" viewBox="0 0 140 78">
                    <path d="M 12 68 A 58 58 0 0 1 128 68" fill="none" stroke="#1A1A1A" strokeWidth="11" strokeLinecap="round" />
                    <path d="M 12 68 A 58 58 0 0 1 128 68" fill="none" stroke={color} strokeWidth="11" strokeLinecap="round"
                      strokeDasharray={`${(score / 100) * 182} 182`} style={{ transition: 'stroke-dasharray 1s ease' }} />
                  </svg>
                  <div className="absolute inset-x-0 bottom-0 text-center">
                    <span className="font-syne font-bold" style={{ color, fontSize: 20 }}>{score.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="mt-1"><RiskBadge nivel={nivel} showScore={false} /></div>
              </>
            )}
          </div>
        </div>

        {/* ── Cuerpo: 3/5 izquierda + 2/5 chat sticky ── */}
        <div className="grid lg:grid-cols-5 gap-5">

          {/* Columna izquierda */}
          <div className="lg:col-span-3 space-y-4">

            {/* Card 1 — Análisis IA */}
            <div style={cs}>
              {secTitle('Análisis de Riesgo', Brain)}
              {cargando ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <div key={i} className="skeleton h-7" style={{ borderRadius: 20 }} />)}
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(detalle?.factores_riesgo || ['Perfil saludable']).map((f, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 font-dm"
                        style={{ background: '#111', border: '1px solid #1A1A1A', borderRadius: 20, padding: '5px 12px', fontSize: 12, color: 'var(--color-text-primary)' }}
                      >
                        <span
                          className="inline-flex items-center justify-center font-syne font-bold flex-shrink-0"
                          style={{ width: 16, height: 16, borderRadius: 8, background: `${color}18`, color, fontSize: 9 }}
                        >
                          {i + 1}
                        </span>
                        {f}
                      </span>
                    ))}
                  </div>
                  <div style={{ borderLeft: `3px solid ${recomendacion.color}`, background: `${recomendacion.color}08`, padding: '10px 14px', borderRadius: '0 6px 6px 0' }}>
                    <p className="font-dm" style={{ color: recomendacion.color, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Recomendación IA
                    </p>
                    <p className="font-syne font-bold mt-1" style={{ color: 'var(--color-text-primary)', fontSize: 14 }}>
                      {recomendacion.texto}
                    </p>
                    <p className="font-dm mt-1" style={{ color: '#888', fontSize: 12 }}>{recomendacion.desc}</p>
                  </div>
                </>
              )}
            </div>

            {/* Card 2 — Detalle del Crédito */}
            <div style={cs}>
              {secTitle('Detalle del Crédito')}
              {!socio.tipo_credito ? (
                <p className="font-dm text-sm" style={{ color: '#555' }}>Este socio no tiene un crédito activo registrado</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Tipo de crédito', val: socio.tipo_credito || '—', valColor: 'var(--color-text-primary)' },
                    { label: 'Saldo pendiente', val: fmt(socio.saldo_pendiente), valColor: '#00FF6A' },
                    { label: 'Días en mora', val: `${socio.dias_mora} días`, valColor: diasColor },
                    { label: 'Estado de mora', val: moraBadge.label, valColor: moraBadge.color },
                  ].map(m => (
                    <div key={m.label} style={{ background: '#111', border: '1px solid #1A1A1A', borderRadius: 8, padding: '12px 14px' }}>
                      <p className="font-dm" style={{ color: '#555', fontSize: 11 }}>{m.label}</p>
                      <p className="font-syne font-bold mt-1.5" style={{ color: m.valColor, fontSize: 16 }}>{m.val}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Card 3 — Gestión */}
            <div style={cs}>
              {secTitle('Gestión')}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (socio.telefono && socio.telefono !== '0000000000') window.open(`tel:${socio.telefono}`, '_self')
                    else toast.error('Sin teléfono registrado')
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 font-dm text-sm transition-all"
                  style={{ background: '#111', border: '1px solid #222', borderRadius: 8, color: 'var(--color-text-primary)' }}
                  onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(0,255,106,0.4)'}
                  onMouseOut={e => e.currentTarget.style.borderColor = '#222'}
                >
                  <Phone size={15} aria-hidden="true" /> Llamar
                </button>
                <button
                  onClick={() => {
                    document.getElementById('chat-whatsapp-seccion')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    setChatHighlight(true)
                    setTimeout(() => chatInputRef.current?.focus(), 400)
                    setTimeout(() => setChatHighlight(false), 1200)
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 font-dm text-sm transition-all"
                  style={{ background: '#111', border: '1px solid #222', borderRadius: 8, color: '#25D366' }}
                  onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(37,211,102,0.4)'}
                  onMouseOut={e => e.currentTarget.style.borderColor = '#222'}
                >
                  <MessageSquare size={15} aria-hidden="true" /> WhatsApp
                </button>
                <button
                  onClick={() => setModalCorreo(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 font-dm text-sm transition-all"
                  style={{ background: '#111', border: '1px solid #222', borderRadius: 8, color: 'var(--color-text-primary)' }}
                  onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(0,255,106,0.4)'}
                  onMouseOut={e => e.currentTarget.style.borderColor = '#222'}
                >
                  <Mail size={15} aria-hidden="true" /> Enviar cobranza
                </button>
              </div>
            </div>

            {/* Card 4 — Promesas de Pago */}
            <div style={cs}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarCheck size={14} style={{ color: '#FFB800' }} aria-hidden="true" />
                  <span className="font-syne font-bold" style={{ color: 'var(--color-text-primary)', fontSize: 13, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Promesas de Pago
                  </span>
                  {promesas.filter(p => p.estado === 'pendiente').length > 0 && (
                    <span className="font-dm text-xs px-1.5 py-0.5" style={{ background: 'rgba(255,184,0,0.15)', color: '#FFB800', borderRadius: 4, fontSize: 10 }}>
                      {promesas.filter(p => p.estado === 'pendiente').length} pendiente{promesas.filter(p => p.estado === 'pendiente').length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => { setFormPromesa(v => !v); setPromesaForm({ monto: '', fecha: '', nota: '' }) }}
                  className="flex items-center gap-1 font-dm text-xs px-2.5 py-1 transition-all"
                  style={{ background: formPromesa ? 'rgba(0,255,106,0.1)' : '#111', border: '1px solid #2A2A2A', borderRadius: 6, color: formPromesa ? '#00FF6A' : '#666' }}
                >
                  <Plus size={11} aria-hidden="true" /> Nueva promesa
                </button>
              </div>

              {/* Formulario nueva promesa */}
              {formPromesa && (
                <form
                  onSubmit={async e => {
                    e.preventDefault()
                    if (!promesaForm.monto || !promesaForm.fecha) return
                    setGuardandoPromesa(true)
                    try {
                      await api.post('/api/promesas/', {
                        socio_id: socio.id,
                        monto_prometido: parseFloat(promesaForm.monto),
                        fecha_prometida: promesaForm.fecha,
                        nota: promesaForm.nota || null,
                      })
                      await cargarPromesas()
                      setFormPromesa(false)
                      toast.success('Promesa registrada ✓')
                    } catch (err) {
                      toast.error(err.response?.data?.detail || 'Error al registrar promesa')
                    } finally { setGuardandoPromesa(false) }
                  }}
                  className="mb-4 p-3 space-y-2"
                  style={{ background: 'rgba(255,184,0,0.04)', border: '1px solid rgba(255,184,0,0.15)', borderRadius: 8 }}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-dm mb-1" style={{ color: '#555' }}>Monto prometido (COP)</label>
                      <input
                        type="number" min="1" step="1000" required
                        placeholder="ej. 500000"
                        value={promesaForm.monto}
                        onChange={e => setPromesaForm(p => ({ ...p, monto: e.target.value }))}
                        className="input text-sm w-full"
                        style={{ fontSize: 13 }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-dm mb-1" style={{ color: '#555' }}>Fecha prometida</label>
                      <input
                        type="date" required
                        min={new Date().toISOString().split('T')[0]}
                        value={promesaForm.fecha}
                        onChange={e => setPromesaForm(p => ({ ...p, fecha: e.target.value }))}
                        className="input text-sm w-full"
                        style={{ fontSize: 13 }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-dm mb-1" style={{ color: '#555' }}>Nota (opcional)</label>
                    <input
                      type="text" maxLength={200}
                      placeholder="ej. Prometió pagar al cobrar nómina"
                      value={promesaForm.nota}
                      onChange={e => setPromesaForm(p => ({ ...p, nota: e.target.value }))}
                      className="input text-sm w-full"
                      style={{ fontSize: 13 }}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={() => setFormPromesa(false)} className="btn-ghost text-xs px-3 py-1.5">Cancelar</button>
                    <button type="submit" disabled={guardandoPromesa} className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5">
                      {guardandoPromesa ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                      Registrar
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de promesas */}
              {promesas.length === 0 ? (
                <p className="font-dm text-sm text-center py-4" style={{ color: '#444' }}>
                  Sin promesas registradas. Úsalas cuando el socio se comprometa a pagar.
                </p>
              ) : (
                <div className="space-y-2">
                  {promesas.map(p => {
                    const esVencida = p.vencida
                    const color = p.estado === 'cumplida' ? '#00FF6A' : p.estado === 'incumplida' ? '#FF4455' : esVencida ? '#FF6B7A' : '#FFB800'
                    const bgColor = p.estado === 'cumplida' ? 'rgba(0,255,106,0.06)' : p.estado === 'incumplida' ? 'rgba(255,68,85,0.06)' : esVencida ? 'rgba(255,68,85,0.06)' : 'rgba(255,184,0,0.06)'
                    const etiqueta = p.estado === 'cumplida' ? 'Cumplida' : p.estado === 'incumplida' ? 'No cumplida' : esVencida ? 'Vencida' : `En ${p.dias_restantes}d`
                    const fecha = new Date(p.fecha_prometida + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
                    return (
                      <div key={p.id} className="flex items-center gap-3 px-3 py-2.5" style={{ background: bgColor, border: `1px solid ${color}22`, borderRadius: 8 }}>
                        <div className="flex-shrink-0 text-center" style={{ minWidth: 42 }}>
                          <Clock size={13} style={{ color, margin: '0 auto 2px' }} aria-hidden="true" />
                          <p className="font-dm" style={{ color, fontSize: 9, fontWeight: 600, textTransform: 'uppercase' }}>{etiqueta}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-syne font-bold" style={{ color: 'var(--color-text-primary)', fontSize: 14 }}>
                            ${p.monto_prometido.toLocaleString('es-CO')} COP
                          </p>
                          <p className="font-dm" style={{ color: '#555', fontSize: 11 }}>{fecha}{p.nota ? ` · ${p.nota}` : ''}</p>
                        </div>
                        {p.estado === 'pendiente' && (
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={async () => {
                                try {
                                  await api.patch(`/api/promesas/${p.id}`, { estado: 'cumplida' })
                                  await cargarPromesas()
                                  toast.success('Promesa marcada como cumplida ✓')
                                } catch { toast.error('Error al actualizar') }
                              }}
                              title="Marcar cumplida"
                              className="flex items-center justify-center transition-all"
                              style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(0,255,106,0.3)', background: 'rgba(0,255,106,0.08)', color: '#00FF6A' }}
                            >
                              <Check size={12} aria-hidden="true" />
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await api.patch(`/api/promesas/${p.id}`, { estado: 'incumplida' })
                                  await cargarPromesas()
                                  toast.error('Promesa marcada como no cumplida')
                                } catch { toast.error('Error al actualizar') }
                              }}
                              title="Marcar incumplida"
                              className="flex items-center justify-center transition-all"
                              style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(255,68,85,0.3)', background: 'rgba(255,68,85,0.08)', color: '#FF4455' }}
                            >
                              <X size={12} aria-hidden="true" />
                            </button>
                          </div>
                        )}
                        <button
                          onClick={async () => {
                            if (!window.confirm('¿Eliminar esta promesa?')) return
                            try {
                              await api.delete(`/api/promesas/${p.id}`)
                              await cargarPromesas()
                            } catch { toast.error('Error al eliminar') }
                          }}
                          title="Eliminar"
                          className="flex items-center justify-center transition-all flex-shrink-0"
                          style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #222', background: 'transparent', color: '#444' }}
                        >
                          <Trash2 size={11} aria-hidden="true" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Card 5 — Historial de Contexto */}
            <HistorialContexto eventos={eventosHistorial} onAgregar={agregarEventoHistorial} onEliminar={eliminarEventoHistorial} />

          </div>

          {/* Columna derecha — Chat sticky */}
          <div className="lg:col-span-2">
            <div id="chat-whatsapp-seccion" style={{ position: 'sticky', top: 24, alignSelf: 'start' }}>
              <ChatWhatsApp
                socio={socio}
                mensajeInicial={mensajeInicial}
                chatInputRef={chatInputRef}
                highlighted={chatHighlight}
                historialEventos={eventosHistorial}
                perfilRiesgo={{ score, dias_mora: socio.dias_mora, monto: socio.saldo_pendiente }}
              />
            </div>
          </div>

        </div>
      </div>

      {modalCorreo && (
        <ModalCorreo
          socio={socio}
          onClose={() => setModalCorreo(false)}
          onEnviado={() => setModalCorreo(false)}
        />
      )}
      {modalEditar && (
        <ModalEditarSocio
          socio={socio}
          onClose={() => setModalEditar(false)}
          onGuardado={actualizado => {
            setSocio(prev => ({ ...prev, ...actualizado }))
            if (onSocioActualizado) onSocioActualizado(actualizado)
            setModalEditar(false)
          }}
        />
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════
   PÁGINA PRINCIPAL — SOCIOS
══════════════════════════════════════════════ */
export default function Socios() {
  const location = useLocation()
  const [socios, setSocios] = useState([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [paginas, setPaginas] = useState(1)
  const [busqueda, setBusqueda] = useState('')
  const [filtroRiesgo, setFiltroRiesgo] = useState('')
  const [filtroMora, setFiltroMora] = useState('')
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState(null)

  const [modalNuevo, setModalNuevo] = useState(false)
  const [modalCSV, setModalCSV] = useState(false)
  const [drawerSocio, setDrawerSocio] = useState(null)
  const [socioDetalle, setSocioDetalle] = useState(null)   // pantalla completa
  const [mensajeInicial, setMensajeInicial] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setErrorCarga(null)
    try {
      const params = new URLSearchParams({ pagina, por_pagina: 15 })
      if (busqueda) params.set('busqueda', busqueda)
      if (filtroRiesgo) params.set('nivel_riesgo', filtroRiesgo)
      if (filtroMora) params.set('estado_mora', filtroMora)
      const { data } = await api.get(`/socios/?${params}`)
      setSocios(data.socios)
      setTotal(data.total)
      setPaginas(data.paginas)
    } catch {
      setErrorCarga('Error al cargar los socios')
    }
    finally { setCargando(false) }
  }, [busqueda, filtroRiesgo, filtroMora, pagina])

  useEffect(() => {
    const t = setTimeout(cargar, busqueda ? 300 : 0)
    return () => clearTimeout(t)
  }, [cargar])

  useEffect(() => {
    if (!location.state?.abrirSocioId) return
    const fetchSocio = async () => {
      try {
        const { data } = await api.get('/socios/' + location.state.abrirSocioId)
        setSocioDetalle(data)
        if (location.state.mensajeInicial) setMensajeInicial(location.state.mensajeInicial)
        if (location.state.abrirChat) {
          setTimeout(() => {
            document.getElementById('chat-whatsapp-seccion')?.scrollIntoView({ behavior: 'smooth' })
          }, 300)
        }
      } catch {}
      window.history.replaceState({}, '')
    }
    fetchSocio()
  }, [location.state]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Pantalla completa del socio ── */
  if (socioDetalle) {
    return (
      <>
        <SocioDetalle
          socio={socioDetalle}
          onVolver={() => { setSocioDetalle(null); setMensajeInicial('') }}
          mensajeInicial={mensajeInicial}
          onSocioActualizado={actualizado => setSocioDetalle(prev => ({ ...prev, ...actualizado }))}
        />
        {/* Drawer sigue disponible si el usuario lo abrió desde el drawer antes de navegar — no aplica acá */}
      </>
    )
  }

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold font-syne" style={{ color: 'var(--color-text-primary)' }}>Socios</h1>
          <p className="text-sm mt-0.5 font-dm" style={{ color: 'var(--color-text-secondary)' }}>
            <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{total}</span> socios registrados
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setModalCSV(true)} className="btn-ghost flex items-center gap-2 text-sm py-2">
            <Upload size={14} aria-hidden="true" /> Importar CSV
          </button>
          <button onClick={() => setModalNuevo(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={14} aria-hidden="true" /> Nuevo socio
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
            <input className="input pl-9 pr-8 text-sm"
              placeholder="Buscar por nombre, cédula, email..."
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setPagina(1) }} />
            {busqueda && (
              <button
                onClick={() => { setBusqueda(''); setPagina(1) }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: '#555' }}
                onMouseOver={e => e.currentTarget.style.color = 'var(--color-text-primary)'}
                onMouseOut={e => e.currentTarget.style.color = '#555'}
                aria-label="Limpiar búsqueda"
              >
                <X size={13} aria-hidden="true" />
              </button>
            )}
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

      {/* Error banner */}
      {errorCarga && !cargando && (
        <div className="card mb-4 flex items-center gap-3 px-4 py-3 text-sm font-dm" style={{ border: '1px solid rgba(255,68,85,0.2)', color: '#FF6B7A', background: 'rgba(255,68,85,0.06)' }}>
          <AlertTriangle size={14} /> Error al cargar los socios. <button onClick={cargar} className="underline">Reintentar</button>
        </div>
      )}

      {/* Tabla */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" role="grid" aria-label="Tabla de socios">
            <thead style={{ borderBottom: '1px solid var(--color-border)' }}>
              <tr>
                {['Socio', 'Ciudad', 'Score IA', 'Estado mora', 'Días mora', 'Saldo', 'Acción'].map(h => (
                  <th key={h} scope="col" className="px-5 py-3.5 text-left text-xs font-medium font-dm" style={{ color: 'var(--color-text-secondary)' }}>
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
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <User size={18} style={{ color: '#444' }} aria-hidden="true" />
                        </div>
                        <div>
                          <p className="font-syne font-semibold text-sm mb-1" style={{ color: '#555' }}>Sin socios</p>
                          <p className="text-xs font-dm" style={{ color: '#3A3A3A' }}>
                            {busqueda || filtroRiesgo || filtroMora
                              ? 'No se encontraron socios con los filtros aplicados'
                              : 'Aún no hay socios registrados en el sistema'}
                          </p>
                        </div>
                        {(busqueda || filtroRiesgo || filtroMora) && (
                          <button
                            onClick={() => { setBusqueda(''); setFiltroRiesgo(''); setFiltroMora(''); setPagina(1) }}
                            className="text-xs font-dm px-3 py-1.5 transition-colors"
                            style={{ border: '1px solid #2A2A2A', borderRadius: 6, color: '#666' }}
                            onMouseOver={e => { e.currentTarget.style.borderColor = '#3A3A3A'; e.currentTarget.style.color = 'var(--color-text-primary)' }}
                            onMouseOut={e => { e.currentTarget.style.borderColor = '#2A2A2A'; e.currentTarget.style.color = '#666' }}
                          >
                            Limpiar filtros
                          </button>
                        )}
                        {!busqueda && !filtroRiesgo && !filtroMora && (
                          <button onClick={() => setModalNuevo(true)} className="btn-primary text-xs px-4 py-2 flex items-center gap-2 mx-auto">
                            <Plus size={13} /> Crear primer socio
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : socios.map(s => {
                  const moraBadge   = MORA_BADGE[s.estado_mora] || MORA_BADGE.al_dia
                  const accionNivel = s.nivel_riesgo === 'alto' ? 'alto' : s.nivel_riesgo === 'medio' ? 'medio' : 'bajo'
                  const accion      = ACCION_BADGE[accionNivel]
                  return (
                    <tr key={s.id} className="transition-colors" style={{ borderBottom: '1px solid #0E0E0E' }}
                      onMouseOver={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
                      onMouseOut={e => e.currentTarget.style.background = ''}>

                      {/* Columna Socio — nombre clickeable abre pantalla completa */}
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => setSocioDetalle(s)}
                          className="text-left transition-colors group"
                          aria-label={`Ver perfil completo de ${s.nombre_completo}`}
                        >
                          <p
                            className="font-medium text-sm font-dm transition-colors group-hover:text-[#00FF6A]"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {s.nombre_completo}
                          </p>
                          <p className="text-xs font-dm" style={{ color: 'var(--color-text-secondary)' }}>
                            {s.cedula} · {s.email}
                          </p>
                        </button>
                      </td>

                      <td className="px-5 py-3.5 text-xs font-dm" style={{ color: 'var(--color-text-secondary)' }}>{s.ciudad}</td>

                      {/* Score IA — sigue abriendo el drawer */}
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

                      {/* Estado mora — badge pill */}
                      <td className="px-5 py-3.5">
                        <span
                          className="text-xs font-dm px-2 py-0.5 inline-block"
                          style={{ background: moraBadge.bg, border: `1px solid ${moraBadge.border}`, borderRadius: 4, color: moraBadge.color }}
                        >
                          {moraBadge.label}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-sm font-dm font-semibold"
                        style={{ color: s.dias_mora > 30 ? 'var(--color-danger)' : s.dias_mora > 0 ? 'var(--color-warning)' : '#555' }}>
                        {s.dias_mora}d
                      </td>

                      <td className="px-5 py-3.5 text-sm font-syne font-semibold" style={{ color: 'var(--color-accent)' }}>
                        {fmt(s.saldo_pendiente)}
                      </td>

                      {/* Acción recomendada — badge mejorado */}
                      <td className="px-5 py-3.5">
                        <span
                          className="text-xs font-dm inline-block"
                          style={{ background: accion.bg, border: `1px solid ${accion.border}`, borderRadius: 6, color: accion.color, padding: '4px 10px' }}
                        >
                          {accion.texto}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            )}
          </table>
        </div>

        {paginas > 1 && (
          <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderTop: '1px solid var(--color-border)' }}>
            <span className="text-xs font-dm" style={{ color: 'var(--color-text-secondary)' }}>{total} socios en total</span>
            <div className="flex items-center gap-2" role="navigation" aria-label="Paginación">
              <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
                className="p-1.5 transition-colors disabled:opacity-30"
                style={{ border: '1px solid var(--color-border)', borderRadius: 4, color: '#555' }} aria-label="Página anterior">
                <ChevronLeft size={13} aria-hidden="true" />
              </button>
              <span className="text-xs font-dm px-2" style={{ color: 'var(--color-text-secondary)' }} aria-label={`Página ${pagina} de ${paginas}`}>
                Página {pagina} de {paginas}
              </span>
              <button onClick={() => setPagina(p => Math.min(paginas, p + 1))} disabled={pagina === paginas}
                className="p-1.5 transition-colors disabled:opacity-30"
                style={{ border: '1px solid var(--color-border)', borderRadius: 4, color: '#555' }} aria-label="Página siguiente">
                <ChevronRight size={13} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modales */}
      {modalNuevo && <ModalNuevoSocio onClose={() => setModalNuevo(false)} onCreado={() => { cargar(); setModalNuevo(false) }} />}
      {modalCSV   && <ModalImportarCSV onClose={() => setModalCSV(false)} onImportado={cargar} />}
      {drawerSocio && <DrawerScoreIA socio={drawerSocio} onClose={() => setDrawerSocio(null)} />}
    </div>
  )
}
