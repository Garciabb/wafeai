import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Filter, AlertTriangle, Info, Zap, Phone, MessageSquare } from 'lucide-react'
import { SkeletonBlock } from '../components/Skeleton'
import { useToast } from '../context/ToastContext'
import api from '../api/client'
import { useClient } from '../context/ClientContext'

const PRIORIDAD_CONFIG = {
  urgente: { cls: 'text-[#FF6B7A] bg-[#FF4455]/10 border-[#FF4455]/20', icono: AlertTriangle, label: 'Urgente' },
  media:   { cls: 'text-[#FFB800] bg-[#FFB800]/10 border-[#FFB800]/20',  icono: Zap,           label: 'Media' },
  baja:    { cls: 'text-[#00E5A0] bg-[#00E5A0]/10 border-[#00E5A0]/20',  icono: Info,          label: 'Baja' },
}

const TIPO_LABEL = {
  riesgo_alto:   'Riesgo Alto IA',
  mora_nueva:    'Nueva Mora',
  pago_vencido:  'Pago Vencido',
  prediccion_ia: 'Predicción IA',
  recupero:      'Recupero',
}

const buildMensaje = (alerta, terminos = { socio: 'socio', mora: 'mora' }, institucion = 'la cooperativa') => {
  const nombre = alerta.socio?.split(' ')[0] || alerta.socio || terminos.socio
  const saldoPart = alerta.saldo
    ? ` de $${Number(alerta.saldo).toLocaleString('es-CO')} COP`
    : ''
  return `Hola ${nombre}, te contactamos de ${institucion}. Notamos que tu crédito${saldoPart} podría necesitar atención pronta. ¿Tienes 5 minutos esta semana para que te orientemos? Queremos ayudarte antes de que llegue a ${terminos.mora}.`
}

export default function Alertas() {
  const toast = useToast()
  const navigate = useNavigate()
  const { config } = useClient()
  const [alertas, setAlertas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [soloNoLeidas, setSoloNoLeidas] = useState(false)

  const cargar = async () => {
    setCargando(true)
    try {
      const params = new URLSearchParams({ limite: 100 })
      if (soloNoLeidas) params.set('solo_no_leidas', 'true')
      if (filtro) params.set('prioridad', filtro)
      const { data } = await api.get(`/alertas/?${params}`)
      setAlertas(data)
    } catch {
      toast.error('Error al cargar las alertas')
    } finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [soloNoLeidas, filtro]) // eslint-disable-line react-hooks/exhaustive-deps

  const marcarLeida = async (id) => {
    try {
      await api.patch(`/alertas/${id}/leer`)
      setAlertas(prev => prev.map(a => a.id === id ? { ...a, leida: true } : a))
    } catch {
      toast.error('No se pudo marcar la alerta como leída')
    }
  }

  const gestionar = async (id) => {
    await marcarLeida(id)
    toast.success('Alerta gestionada ✓')
  }

  const llamar = (alerta) => {
    if (alerta.telefono) {
      window.open(`tel:${alerta.telefono}`, '_self')
    } else {
      toast.error('Sin teléfono registrado para este socio')
    }
  }

  const irAPerfilWhatsApp = (alerta) => {
    navigate('/socios', {
      state: {
        abrirSocioId: alerta.socio_id,
        abrirChat: true,
        mensajeInicial: buildMensaje(alerta, config.terminos, config.institucion),
      }
    })
  }

  const marcarTodasLeidas = async () => {
    try {
      await api.patch('/alertas/leer-todas')
      setAlertas(prev => prev.map(a => ({ ...a, leida: true })))
      toast.success('Todas las alertas marcadas como leídas')
    } catch {
      toast.error('Error al actualizar las alertas')
    }
  }

  const noLeidas = alertas.filter(a => !a.leida).length
  const urgentes = alertas.filter(a => a.prioridad === 'urgente' && !a.leida)

  const gruposPrioridad = {
    urgente: alertas.filter(a => a.prioridad === 'urgente'),
    media:   alertas.filter(a => a.prioridad === 'media'),
    baja:    alertas.filter(a => a.prioridad === 'baja'),
  }

  const renderAlerta = (a) => {
    const { cls, icono: Icono } = PRIORIDAD_CONFIG[a.prioridad] || PRIORIDAD_CONFIG.baja
    return (
      <li
        key={a.id}
        className={`card flex items-start gap-4 transition-opacity ${!a.leida ? '' : 'opacity-40'}`}
        aria-label={`Alerta ${a.prioridad}: ${a.mensaje}`}
      >
        <div className={`p-2 flex-shrink-0 ${cls}`} style={{ borderRadius: 6, border: '1px solid' }} aria-hidden="true">
          <Icono size={13} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 font-dm ${cls}`} style={{ borderRadius: 4, border: '1px solid' }}>
              {TIPO_LABEL[a.tipo] || a.tipo}
            </span>
            <span className="text-xs font-dm" style={{ color: 'var(--color-text-secondary)' }}>{a.socio}</span>
            {!a.leida && (
              <span
                className="w-1.5 h-1.5"
                style={{ background: 'var(--color-accent)', borderRadius: 2 }}
                aria-label="No leída"
              />
            )}
            {a.prioridad === 'urgente' && (
              <span className="text-xs px-2 py-0.5 font-dm font-semibold"
                style={{ background: 'rgba(255,68,85,0.12)', color: '#FF6B7A', borderRadius: 4 }}>
                ⏱ ~38 días
              </span>
            )}
          </div>
          <p className="text-sm font-dm leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
            {a.mensaje}
          </p>
          <p className="text-xs mt-1 font-dm" style={{ color: '#444' }}>
            {a.fecha ? new Date(a.fecha).toLocaleString('es-CO') : '—'}
          </p>

          <div className="flex gap-2 mt-2">
            <button
              onClick={() => llamar(a)}
              className="flex items-center gap-1 text-xs px-2 py-1 font-dm transition-colors"
              style={{ border: '1px solid var(--color-border)', borderRadius: 4, color: 'var(--color-text-secondary)', background: 'transparent' }}
              onMouseOver={e => { e.currentTarget.style.color = '#00E5A0'; e.currentTarget.style.borderColor = '#00E5A0' }}
              onMouseOut={e => { e.currentTarget.style.color = 'var(--color-text-secondary)'; e.currentTarget.style.borderColor = 'var(--color-border)' }}
              aria-label={`Llamar a ${a.socio}`}
            >
              <Phone size={11} aria-hidden="true" /> Llamar
            </button>
            <button
              onClick={() => irAPerfilWhatsApp(a)}
              className="flex items-center gap-1 text-xs px-2 py-1 font-dm transition-colors"
              style={{ border: '1px solid var(--color-border)', borderRadius: 4, color: 'var(--color-text-secondary)', background: 'transparent' }}
              onMouseOver={e => { e.currentTarget.style.color = '#25D366'; e.currentTarget.style.borderColor = '#25D366' }}
              onMouseOut={e => { e.currentTarget.style.color = 'var(--color-text-secondary)'; e.currentTarget.style.borderColor = 'var(--color-border)' }}
              aria-label={`Enviar WhatsApp a ${a.socio}`}
            >
              <MessageSquare size={11} aria-hidden="true" /> WhatsApp
            </button>
            <button
              onClick={() => gestionar(a.id)}
              className="flex items-center gap-1 text-xs px-2 py-1 font-dm transition-colors"
              style={{ border: '1px solid var(--color-border)', borderRadius: 4, color: 'var(--color-text-secondary)', background: 'transparent' }}
              onMouseOver={e => { e.currentTarget.style.color = 'var(--color-accent)'; e.currentTarget.style.borderColor = 'var(--color-accent)' }}
              onMouseOut={e => { e.currentTarget.style.color = 'var(--color-text-secondary)'; e.currentTarget.style.borderColor = 'var(--color-border)' }}
              aria-label={`Gestionar alerta de ${a.socio}`}
            >
              <CheckCheck size={11} aria-hidden="true" /> Gestionar
            </button>
          </div>
        </div>
        {!a.leida && (
          <button
            onClick={() => marcarLeida(a.id)}
            className="flex-shrink-0 transition-colors p-1"
            style={{ color: '#444' }}
            aria-label={`Marcar alerta de ${a.socio} como leída`}
            onMouseOver={e => e.currentTarget.style.color = 'var(--color-accent)'}
            onMouseOut={e => e.currentTarget.style.color = '#444'}
          >
            <CheckCheck size={14} aria-hidden="true" />
          </button>
        )}
      </li>
    )
  }

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold font-syne flex items-center gap-3"
            style={{ color: 'var(--color-text-primary)' }}>
            <Bell size={22} style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
            Alertas
            <span aria-live="polite" aria-atomic="true" className="sr-only">
              {noLeidas > 0 ? `${noLeidas} alertas no leídas` : 'No hay alertas sin leer'}
            </span>
            {noLeidas > 0 && (
              <span
                className="text-white text-xs px-2 py-0.5 font-dm font-semibold"
                style={{ background: 'var(--color-danger)', borderRadius: 4 }}
                aria-label={`${noLeidas} no leídas`}
              >
                {noLeidas}
              </span>
            )}
          </h1>
          <p className="text-sm mt-0.5 font-dm" style={{ color: 'var(--color-text-secondary)' }}>
            Centro de notificaciones y alertas de la IA
          </p>
        </div>
        {noLeidas > 0 && (
          <button onClick={marcarTodasLeidas} className="btn-ghost flex items-center gap-2 text-sm py-2">
            <CheckCheck size={13} aria-hidden="true" /> Marcar todas como leídas
          </button>
        )}
      </div>

      {/* Banner urgente */}
      {!cargando && urgentes.length > 0 && !filtro && (
        <div
          className="flex items-center gap-3 px-4 py-3 mb-6 text-sm font-dm font-medium"
          style={{ background: 'rgba(255,68,85,0.06)', border: '1px solid rgba(255,68,85,0.2)', borderRadius: 8, color: '#FF6B7A' }}
          role="alert"
        >
          <AlertTriangle size={16} aria-hidden="true" />
          <span>
            <strong>{urgentes.length} alerta{urgentes.length > 1 ? 's urgentes' : ' urgente'}</strong> requiere{urgentes.length > 1 ? 'n' : ''} acción inmediata — ventana de intervención: próximos 38 días.
          </span>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Filtros de alertas">
        <button
          onClick={() => setSoloNoLeidas(p => !p)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-dm transition-colors"
          style={{
            border: `1px solid ${soloNoLeidas ? 'var(--color-accent)' : 'var(--color-border)'}`,
            color: soloNoLeidas ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            background: soloNoLeidas ? 'rgba(0,229,160,0.08)' : 'transparent',
            borderRadius: 4,
          }}
          aria-pressed={soloNoLeidas}
        >
          <Filter size={11} aria-hidden="true" /> Solo no leídas
        </button>
        {['urgente', 'media', 'baja'].map(p => {
          const { label } = PRIORIDAD_CONFIG[p]
          const active = filtro === p
          return (
            <button
              key={p}
              onClick={() => setFiltro(f => f === p ? '' : p)}
              className="px-3 py-1.5 text-xs font-dm transition-colors"
              style={{
                border: `1px solid ${active ? 'currentColor' : 'var(--color-border)'}`,
                color: active
                  ? p === 'urgente' ? '#FF6B7A' : p === 'media' ? '#FFB800' : 'var(--color-accent)'
                  : 'var(--color-text-secondary)',
                background: active ? (p === 'urgente' ? 'rgba(255,68,85,0.08)' : p === 'media' ? 'rgba(255,184,0,0.08)' : 'rgba(0,229,160,0.08)') : 'transparent',
                borderRadius: 4,
              }}
              aria-pressed={active}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Lista de alertas */}
      <div role="region" aria-label="Lista de alertas" aria-live="polite" aria-busy={cargando}>
        {cargando ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="card flex items-start gap-4">
                <SkeletonBlock className="w-8 h-8 flex-shrink-0" style={{ borderRadius: 6 }} />
                <div className="flex-1 space-y-2">
                  <SkeletonBlock className="h-3 w-3/4" />
                  <SkeletonBlock className="h-2.5 w-1/2" />
                  <SkeletonBlock className="h-2 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : alertas.length === 0 ? (
          <div className="card text-center py-16" aria-label="Sin alertas">
            <Bell size={36} aria-hidden="true" style={{ margin: '0 auto 12px', color: '#222' }} />
            <p className="font-syne font-semibold text-sm mb-1" style={{ color: '#555' }}>Sin alertas</p>
            <p className="text-sm font-dm" style={{ color: '#444' }}>
              No hay alertas {soloNoLeidas ? 'no leídas' : filtro ? `de prioridad ${filtro}` : 'en este momento'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {(['urgente', 'media', 'baja']).map(p => {
              const grupo = filtro
                ? (filtro === p ? alertas : [])
                : (gruposPrioridad[p] || [])
              if (grupo.length === 0) return null
              const { label } = PRIORIDAD_CONFIG[p]
              const colorHeader = p === 'urgente' ? '#FF6B7A' : p === 'media' ? '#FFB800' : '#00E5A0'
              return (
                <div key={p}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-dm font-semibold uppercase tracking-wider" style={{ color: colorHeader }}>
                      {label}
                    </span>
                    <span
                      className="text-xs font-dm px-2 py-0.5"
                      style={{ background: `${colorHeader}18`, color: colorHeader, borderRadius: 4 }}
                    >
                      {grupo.length}
                    </span>
                    <div className="flex-1 h-px" style={{ background: `${colorHeader}20` }} />
                  </div>
                  <ul className="space-y-2" role="list">
                    {grupo.map(renderAlerta)}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
