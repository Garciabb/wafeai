import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const ICONS = {
  success: CheckCircle,
  error:   AlertTriangle,
  warning: AlertTriangle,
  info:    Info,
}

const STYLES = {
  success: { border: 'rgba(0,229,160,0.25)',  bg: 'rgba(0,229,160,0.08)',  icon: '#00E5A0' },
  error:   { border: 'rgba(255,68,85,0.25)',  bg: 'rgba(255,68,85,0.08)',  icon: '#FF4455' },
  warning: { border: 'rgba(255,184,0,0.25)',  bg: 'rgba(255,184,0,0.08)',  icon: '#FFB800' },
  info:    { border: 'rgba(255,255,255,0.15)', bg: 'rgba(255,255,255,0.04)', icon: '#888888' },
}

let uid = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id])
    setToasts(p => p.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++uid
    setToasts(p => [...p.slice(-4), { id, message, type }]) // max 5 toasts
    timers.current[id] = setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  // Atajos de conveniencia
  toast.success = (m, d) => toast(m, 'success', d)
  toast.error   = (m, d) => toast(m, 'error',   d ?? 6000)
  toast.warning = (m, d) => toast(m, 'warning', d)
  toast.info    = (m, d) => toast(m, 'info',    d)

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div
        role="region"
        aria-label="Notificaciones"
        aria-live="polite"
        className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map(({ id, message, type }) => {
          const Icono = ICONS[type] || Info
          const s = STYLES[type] || STYLES.info
          return (
            <div
              key={id}
              role="alert"
              className="pointer-events-auto flex items-start gap-3 px-4 py-3 font-dm text-sm animate-slide-up"
              style={{
                background: '#111111',
                border: `1px solid ${s.border}`,
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                minWidth: '280px',
                maxWidth: '420px',
              }}
            >
              <Icono size={15} style={{ color: s.icon, flexShrink: 0, marginTop: 1 }} />
              <span className="flex-1 text-[#F0F0EB]">{message}</span>
              <button
                onClick={() => dismiss(id)}
                className="text-[#555] hover:text-[#888] transition-colors flex-shrink-0"
                aria-label="Cerrar notificación"
              >
                <X size={13} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
