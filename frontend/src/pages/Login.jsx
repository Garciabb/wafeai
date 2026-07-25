import { useState, useEffect, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, Loader2, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useClient, CLIENT_CONFIGS } from '../context/ClientContext'
import Logo from '../components/Logo'

/* Validación inline sin alert() del browser */
function validate(form) {
  const errs = {}
  if (!form.email.trim()) {
    errs.email = 'El email es obligatorio'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errs.email = 'El email no tiene un formato válido'
  }
  if (!form.password) {
    errs.password = 'La contraseña es obligatoria'
  } else if (form.password.length < 6) {
    errs.password = 'La contraseña debe tener al menos 6 caracteres'
  }
  return errs
}

export default function Login() {
  const navigate = useNavigate()
  const { login, cargando, autenticado } = useAuth()
  const { clientTipo, cambiarCliente, config } = useClient()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errs, setErrs] = useState({})
  const [apiError, setApiError] = useState(null)
  const [verPassword, setVerPassword] = useState(false)
  const [tardando, setTardando] = useState(false)
  const emailId = useId()
  const passwordId = useId()

  useEffect(() => {
    if (autenticado) navigate('/', { replace: true })
  }, [autenticado, navigate])

  // El backend gratuito puede "dormir" tras inactividad — si el login tarda,
  // explicamos por qué en vez de dejar el spinner sin contexto.
  useEffect(() => {
    if (!cargando) { setTardando(false); return }
    const t = setTimeout(() => setTardando(true), 4000)
    return () => clearTimeout(t)
  }, [cargando])

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    // Limpiar error del campo al escribir
    if (errs[k]) setErrs(p => ({ ...p, [k]: undefined }))
    setApiError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validErrs = validate(form)
    if (Object.keys(validErrs).length > 0) {
      setErrs(validErrs)
      return
    }
    const result = await login(form.email, form.password)
    if (result.ok) {
      navigate('/', { replace: true })
    } else {
      setApiError(result.error || 'Email o contraseña incorrectos')
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>
      {/* Panel izquierdo — branding */}
      <div
        className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center p-16"
        style={{ background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)' }}
        aria-hidden="true"
      >
        {/* Grid sutil — sin gradientes de neón */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(var(--color-accent) 1px, transparent 1px), linear-gradient(90deg, var(--color-accent) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
        <div className="relative z-10 text-center">
          <Logo size="lg" />
          <p className="text-base mt-4 font-dm leading-relaxed max-w-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {config.emoji} Solución de IA para {config.entidad}s — predicción de mora con 94% de precisión
          </p>
          <div className="mt-12 space-y-5 text-left">
            {[
              { n: '94%',   txt: 'precisión en predicción de mora' },
              { n: '3×',    txt: 'más recupero con cobranza automatizada' },
              { n: '< 5min',txt: 'para detectar nuevos riesgos' },
            ].map(({ n, txt }) => (
              <div key={n} className="flex items-center gap-4">
                <span className="text-2xl font-bold font-syne min-w-[70px]" style={{ color: 'var(--color-accent)' }}>
                  {n}
                </span>
                <span className="text-sm font-dm" style={{ color: '#666' }}>{txt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo size="md" />
          </div>

          <h1 className="text-3xl font-bold font-syne mb-1" style={{ color: 'var(--color-text-primary)' }}>
            Bienvenido
          </h1>
          <p className="text-sm font-dm mb-8" style={{ color: 'var(--color-text-secondary)' }}>
            Ingresa a tu plataforma WafeAI
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-label="Formulario de inicio de sesión">
            {/* Email */}
            <div>
              <label htmlFor={emailId} className="block text-xs font-medium font-dm mb-1.5"
                style={{ color: 'var(--color-text-secondary)' }}>
                Email
              </label>
              <input
                id={emailId}
                type="email"
                className="input"
                placeholder="admin@wafeai.co"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                autoComplete="email"
                aria-invalid={!!errs.email}
                aria-describedby={errs.email ? `${emailId}-error` : undefined}
                aria-required="true"
              />
              {errs.email && (
                <p id={`${emailId}-error`} className="field-error" role="alert">
                  <AlertTriangle size={11} aria-hidden="true" />
                  {errs.email}
                </p>
              )}
            </div>

            {/* Contraseña */}
            <div>
              <label htmlFor={passwordId} className="block text-xs font-medium font-dm mb-1.5"
                style={{ color: 'var(--color-text-secondary)' }}>
                Contraseña
              </label>
              <div className="relative">
                <input
                  id={passwordId}
                  type={verPassword ? 'text' : 'password'}
                  className="input pr-11"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  autoComplete="current-password"
                  aria-invalid={!!errs.password}
                  aria-describedby={errs.password ? `${passwordId}-error` : undefined}
                  aria-required="true"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#555' }}
                  onClick={() => setVerPassword(p => !p)}
                  aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {verPassword
                    ? <EyeOff size={14} aria-hidden="true" />
                    : <Eye size={14} aria-hidden="true" />}
                </button>
              </div>
              {errs.password && (
                <p id={`${passwordId}-error`} className="field-error" role="alert">
                  <AlertTriangle size={11} aria-hidden="true" />
                  {errs.password}
                </p>
              )}
            </div>

            {/* Error de API */}
            {apiError && (
              <div
                className="flex items-center gap-2 px-4 py-3 text-sm font-dm"
                style={{
                  background: 'rgba(255,68,85,0.08)',
                  border: '1px solid rgba(255,68,85,0.2)',
                  borderRadius: 6,
                  color: 'var(--color-danger)',
                }}
                role="alert"
                aria-live="polite"
              >
                <AlertTriangle size={14} aria-hidden="true" />
                {apiError}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full py-3"
              disabled={cargando}
              aria-busy={cargando}
            >
              {cargando
                ? <><Loader2 size={15} className="animate-spin" aria-hidden="true" /> Ingresando...</>
                : <><ArrowRight size={15} aria-hidden="true" /> Ingresar</>
              }
            </button>
            {tardando && (
              <p className="text-xs font-dm text-center -mt-2" style={{ color: 'var(--color-text-secondary)' }} role="status" aria-live="polite">
                Esto puede tardar unos segundos si el sistema estaba inactivo...
              </p>
            )}
          </form>

          {/* Selector de tipo de cliente — Modo Demo */}
          <div
            className="mt-6 p-4 font-dm"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
            }}
            aria-label="Selector de modo demo"
          >
            <p className="text-xs mb-3 font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              🎯 Demo personalizada — ¿qué tipo de institución eres?
            </p>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(CLIENT_CONFIGS).map(cfg => (
                <button
                  key={cfg.tipo}
                  type="button"
                  onClick={() => cambiarCliente(cfg.tipo)}
                  className="text-left px-3 py-2 rounded transition-all text-xs font-dm"
                  style={{
                    background: clientTipo === cfg.tipo ? 'rgba(0,255,106,0.12)' : 'transparent',
                    border: clientTipo === cfg.tipo ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                    color: clientTipo === cfg.tipo ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    cursor: 'pointer',
                  }}
                  aria-pressed={clientTipo === cfg.tipo}
                >
                  <span className="mr-1">{cfg.emoji}</span>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Credenciales demo */}
          <div
            className="mt-4 p-4 font-dm"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
            }}
            aria-label="Credenciales de demostración"
          >
            <p className="text-xs mb-2" style={{ color: '#555' }}>Credenciales demo:</p>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>adrianaarchilaq@gmail.com / WafeAI2026</p>
          </div>
        </div>
      </div>
    </div>
  )
}
