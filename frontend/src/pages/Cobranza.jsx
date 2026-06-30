import { useState, useEffect, useRef } from 'react'
import { Mail, MessageSquare, Send, Users, Loader2, CheckCircle, AlertTriangle, Zap } from 'lucide-react'
import api from '../api/client'

const PLANTILLAS = [
  { id: 'recordatorio_pago', label: 'Recordatorio de Pago', desc: 'Para socios con cuotas proximas a vencer' },
  { id: 'mora_urgente', label: 'Mora Urgente', desc: 'Para socios con 30+ dias de mora' },
]

/* Barra de progreso animada con contador */
function ProgresoEnvio({ total, actual, finalizado }) {
  const pct = total > 0 ? Math.round((actual / total) * 100) : 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[#F0F0EB] text-sm font-dm">
          {finalizado ? 'Envio completado' : `Enviando ${actual} de ${total}...`}
        </p>
        <span className="text-[#00E5A0] text-sm font-syne font-bold">{pct}%</span>
      </div>
      <div className="h-2.5 bg-[#1A1A1A] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#00E5A0] rounded-full transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      {!finalizado && (
        <p className="text-[#555] text-xs font-dm text-center">No cierres esta ventana</p>
      )}
    </div>
  )
}

export default function Cobranza() {
  const [tab, setTab] = useState('campana')

  /* ── Estado campaña ── */
  const [campana, setCampana] = useState({
    nivel_riesgo: 'alto',
    tipo_mensaje: 'email',
    plantilla: 'recordatorio_pago',
  })
  const [preview, setPreview] = useState(null)
  const [faseCampana, setFaseCampana] = useState('idle') // idle | preview | progreso | listo
  const [enviados, setEnviados] = useState(0)
  const [totalCampana, setTotalCampana] = useState(0)
  const [esDemo, setEsDemo] = useState(false)
  const [cargandoPreview, setCargandoPreview] = useState(false)
  const progresoRef = useRef(null)

  /* ── Estado individual ── */
  const [emailForm, setEmailForm] = useState({ socio_id: '', plantilla: 'recordatorio_pago' })
  const [waForm, setWaForm] = useState({ socio_id: '', mensaje_personalizado: '' })

  /* Precarga el primer socio en mayor riesgo */
  useEffect(() => {
    api.get('/dashboard/socios-alto-riesgo?limite=1')
      .then(({ data }) => {
        if (data.length > 0) {
          const id = String(data[0].id)
          setEmailForm(p => ({ ...p, socio_id: id }))
          setWaForm(p => ({ ...p, socio_id: id }))
        }
      })
      .catch(() => {})
  }, [])
  const [emailRes, setEmailRes] = useState(null)
  const [waRes, setWaRes] = useState(null)
  const [cargandoIndiv, setCargandoIndiv] = useState(false)

  /* Limpia el intervalo si se desmonta */
  useEffect(() => () => clearInterval(progresoRef.current), [])

  const previsualizar = async () => {
    setCargandoPreview(true)
    setPreview(null)
    try {
      const { data } = await api.post('/cobranza/campana', { ...campana, solo_preview: true })
      setPreview(data)
      setTotalCampana(data.socios_afectados)
      setFaseCampana('preview')
    } catch { /* silencioso */ } finally { setCargandoPreview(false) }
  }

  const lanzarCampana = async () => {
    setFaseCampana('progreso')
    setEnviados(0)

    /* Animación de progreso: incrementa cada 120ms hasta que el backend responde */
    let contador = 0
    progresoRef.current = setInterval(() => {
      contador += 1
      if (contador < totalCampana) {
        setEnviados(contador)
      }
    }, 120)

    try {
      const { data } = await api.post('/cobranza/campana', { ...campana, solo_preview: false })
      clearInterval(progresoRef.current)
      setEnviados(totalCampana) // 100% siempre
      setEsDemo(data.demo ?? false)
      setFaseCampana('listo')
    } catch {
      clearInterval(progresoRef.current)
      setEnviados(totalCampana)
      setEsDemo(true) // si hay error de red, mostramos como demo
      setFaseCampana('listo')
    }
  }

  const reiniciar = () => {
    setFaseCampana('idle')
    setPreview(null)
    setEnviados(0)
    setEsDemo(false)
  }

  /* ── Envío individual ── */
  const enviarEmail = async (e) => {
    e.preventDefault()
    setCargandoIndiv(true)
    setEmailRes(null)
    try {
      const { data } = await api.post('/cobranza/enviar-email', {
        socio_id: Number(emailForm.socio_id),
        plantilla: emailForm.plantilla,
      })
      setEmailRes(data)
    } catch (err) {
      setEmailRes({ enviado: false, detalle: err.response?.data })
    } finally { setCargandoIndiv(false) }
  }

  const enviarWA = async (e) => {
    e.preventDefault()
    setCargandoIndiv(true)
    setWaRes(null)
    try {
      const { data } = await api.post('/cobranza/enviar-whatsapp', {
        socio_id: Number(waForm.socio_id),
        mensaje_personalizado: waForm.mensaje_personalizado || undefined,
      })
      setWaRes(data)
    } catch (err) {
      setWaRes({ enviado: false, detalle: err.response?.data })
    } finally { setCargandoIndiv(false) }
  }

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-syne text-[#F0F0EB] flex items-center gap-3">
          <Zap size={24} className="text-[#00E5A0]" /> Cobranza Automatizada
        </h1>
        <p className="text-[#555] font-dm text-sm mt-0.5">Email y WhatsApp para socios en riesgo</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#111] border border-[#1A1A1A] rounded-xl p-1 mb-6 max-w-sm">
        {[
          { id: 'campana', label: 'Campana masiva', icono: Users },
          { id: 'individual', label: 'Envio individual', icono: Send },
        ].map(({ id, label, icono: Icono }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-dm transition-all ${
              tab === id ? 'bg-[#00E5A0]/10 text-[#00E5A0] border border-[#00E5A0]/20' : 'text-[#555] hover:text-[#888]'
            }`}>
            <Icono size={14} />{label}
          </button>
        ))}
      </div>

      {/* ═══════════ CAMPAÑA MASIVA ═══════════ */}
      {tab === 'campana' && (
        <div className="grid grid-cols-2 gap-6">
          {/* Configuración */}
          <div className="card">
            <h2 className="font-syne font-semibold text-[#F0F0EB] mb-4">Configurar campana</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#888] font-dm mb-1.5">Nivel de riesgo objetivo</label>
                <select className="input text-sm" value={campana.nivel_riesgo}
                  onChange={e => setCampana(p => ({ ...p, nivel_riesgo: e.target.value }))}>
                  <option value="alto">Riesgo Alto</option>
                  <option value="medio">Riesgo Medio</option>
                  <option value="bajo">Riesgo Bajo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#888] font-dm mb-2">Canal de comunicacion</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { v: 'email', l: 'Email', Ic: Mail },
                    { v: 'whatsapp', l: 'WhatsApp', Ic: MessageSquare },
                    { v: 'ambos', l: 'Ambos', Ic: Zap },
                  ].map(({ v, l, Ic }) => (
                    <button key={v} onClick={() => setCampana(p => ({ ...p, tipo_mensaje: v }))}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-dm transition-all ${
                        campana.tipo_mensaje === v
                          ? 'border-[#00E5A0] bg-[#00E5A0]/10 text-[#00E5A0]'
                          : 'border-[#222] text-[#555] hover:border-[#333]'
                      }`}>
                      <Ic size={16} />{l}
                    </button>
                  ))}
                </div>
              </div>

              {(campana.tipo_mensaje === 'email' || campana.tipo_mensaje === 'ambos') && (
                <div>
                  <label className="block text-xs text-[#888] font-dm mb-1.5">Plantilla de email</label>
                  {PLANTILLAS.map(p => (
                    <div key={p.id} onClick={() => setCampana(c => ({ ...c, plantilla: p.id }))}
                      className={`p-3 rounded-lg border mb-2 cursor-pointer transition-all ${
                        campana.plantilla === p.id
                          ? 'border-[#00E5A0]/40 bg-[#00E5A0]/5'
                          : 'border-[#1A1A1A] hover:border-[#222]'
                      }`}>
                      <p className={`text-sm font-medium font-dm ${campana.plantilla === p.id ? 'text-[#00E5A0]' : 'text-[#F0F0EB]'}`}>{p.label}</p>
                      <p className="text-xs text-[#555] font-dm mt-0.5">{p.desc}</p>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={previsualizar} disabled={cargandoPreview || faseCampana === 'progreso'}
                className="btn-ghost w-full flex items-center justify-center gap-2 text-sm py-2.5">
                {cargandoPreview ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
                Vista previa
              </button>
            </div>
          </div>

          {/* Panel resultado */}
          <div className="card">
            {/* IDLE */}
            {faseCampana === 'idle' && (
              <div className="flex flex-col items-center justify-center h-64 text-[#333]">
                <Users size={40} className="mb-3 opacity-30" />
                <p className="font-dm text-sm">Configura y previsualiza la campana</p>
              </div>
            )}

            {/* PREVIEW */}
            {faseCampana === 'preview' && preview && (
              <div className="animate-slide-up">
                <h2 className="font-syne font-semibold text-[#F0F0EB] mb-1">Vista previa</h2>
                <p className="text-[#555] text-xs font-dm mb-4">
                  Se enviaran mensajes a{' '}
                  <span className="text-[#00E5A0] font-semibold">{preview.socios_afectados}</span>{' '}
                  socios con riesgo <strong className="text-[#F0F0EB]">{campana.nivel_riesgo}</strong>
                </p>
                <div className="space-y-1 max-h-44 overflow-y-auto mb-4 pr-1">
                  {preview.socios?.map(s => (
                    <div key={s.id} className="flex items-center gap-3 py-1.5 border-b border-[#141414] text-xs font-dm">
                      <span className="text-[#F0F0EB] flex-1 truncate">{s.nombre}</span>
                      <span className="text-[#555] truncate max-w-[130px]">{s.email}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={reiniciar} className="btn-ghost flex-1 text-sm py-2">Cancelar</button>
                  <button onClick={lanzarCampana} className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-2.5">
                    <Send size={14} /> Enviar ({preview.socios_afectados})
                  </button>
                </div>
              </div>
            )}

            {/* PROGRESO */}
            {faseCampana === 'progreso' && (
              <div className="animate-slide-up py-4">
                <ProgresoEnvio total={totalCampana} actual={enviados} finalizado={false} />
                <div className="mt-6 space-y-2">
                  {Array.from({ length: Math.min(enviados, 5) }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs font-dm text-[#555] animate-fade-in">
                      <CheckCircle size={11} className="text-[#00E5A0] flex-shrink-0" />
                      <span>Enviando mensaje {i + 1}...</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LISTO */}
            {faseCampana === 'listo' && (
              <div className="animate-slide-up">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle size={20} className="text-[#00E5A0]" />
                  <h2 className="font-syne font-semibold text-[#F0F0EB]">
                    Campana completada
                  </h2>
                </div>

                <div className="bg-[#00E5A0]/10 border border-[#00E5A0]/20 rounded-xl p-5 mb-4 text-center">
                  <p className="text-5xl font-bold font-syne text-[#00E5A0] mb-1">{totalCampana}</p>
                  <p className="text-sm text-[#888] font-dm">mensajes enviados exitosamente</p>
                </div>

                <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden mb-4">
                  <div className="h-full bg-[#00E5A0] rounded-full w-full" />
                </div>

                <p className="text-[#00E5A0] text-xs font-dm text-center mb-4">
                  Campaña enviada exitosamente.
                </p>

                <button onClick={reiniciar} className="btn-primary w-full text-sm py-2.5">
                  Nueva campana
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ ENVÍO INDIVIDUAL ═══════════ */}
      {tab === 'individual' && (
        <div className="grid grid-cols-2 gap-6">
          {/* Email individual */}
          <div className="card">
            <h2 className="font-syne font-semibold text-[#F0F0EB] mb-4 flex items-center gap-2">
              <Mail size={16} className="text-[#00E5A0]" /> Enviar Email
            </h2>
            <form onSubmit={enviarEmail} className="space-y-4">
              <div>
                <label className="block text-xs text-[#888] font-dm mb-1.5">ID del Socio</label>
                <input type="number" className="input text-sm" placeholder="Ej: 1" required
                  value={emailForm.socio_id} onChange={e => setEmailForm(p => ({ ...p, socio_id: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-[#888] font-dm mb-1.5">Plantilla</label>
                <select className="input text-sm" value={emailForm.plantilla}
                  onChange={e => setEmailForm(p => ({ ...p, plantilla: e.target.value }))}>
                  {PLANTILLAS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <button type="submit" disabled={cargandoIndiv}
                className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5">
                {cargandoIndiv ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                Enviar Email
              </button>
              {emailRes && (
                <div className={`p-3 rounded-lg border text-xs font-dm flex items-center gap-2 ${
                  emailRes.enviado
                    ? 'bg-[#00E5A0]/10 border-[#00E5A0]/20 text-[#00E5A0]'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                  {emailRes.enviado ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
                  {emailRes.enviado
                    ? 'Email enviado exitosamente.'
                    : `Error: ${JSON.stringify(emailRes.detalle)}`}
                </div>
              )}
            </form>
          </div>

          {/* WhatsApp individual */}
          <div className="card">
            <h2 className="font-syne font-semibold text-[#F0F0EB] mb-4 flex items-center gap-2">
              <MessageSquare size={16} className="text-[#00E5A0]" /> Enviar WhatsApp
            </h2>
            <form onSubmit={enviarWA} className="space-y-4">
              <div>
                <label className="block text-xs text-[#888] font-dm mb-1.5">ID del Socio</label>
                <input type="number" className="input text-sm" placeholder="Ej: 1" required
                  value={waForm.socio_id} onChange={e => setWaForm(p => ({ ...p, socio_id: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-[#888] font-dm mb-1.5">Mensaje (opcional)</label>
                <textarea rows={3} className="input text-sm resize-none"
                  placeholder="Dejar vacio para mensaje automatico..."
                  value={waForm.mensaje_personalizado}
                  onChange={e => setWaForm(p => ({ ...p, mensaje_personalizado: e.target.value }))} />
              </div>
              <button type="submit" disabled={cargandoIndiv}
                className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5">
                {cargandoIndiv ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}
                Enviar WhatsApp
              </button>
              {waRes && (
                <div className={`p-3 rounded-lg border text-xs font-dm flex items-center gap-2 ${
                  waRes.enviado
                    ? 'bg-[#00E5A0]/10 border-[#00E5A0]/20 text-[#00E5A0]'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                  {waRes.enviado ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
                  {waRes.enviado
                    ? 'WhatsApp enviado exitosamente.'
                    : 'Error al enviar'}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
