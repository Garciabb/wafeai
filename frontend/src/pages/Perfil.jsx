import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Shield, LogOut, Save, KeyRound, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import api from '../api/client'

const ROL_LABEL = { admin: 'Administrador', analista: 'Analista' }
const ROL_COLOR = { admin: { bg: 'rgba(0,255,106,0.1)', color: '#00FF6A' }, analista: { bg: 'rgba(255,184,0,0.1)', color: '#FFB800' } }

function iniciales(nombre, apellido) {
  return `${(nombre?.[0] || '').toUpperCase()}${(apellido?.[0] || '').toUpperCase()}` || 'U'
}

export default function Perfil() {
  const { usuario, logout, actualizarUsuario } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  /* ── Datos frescos desde /me ── */
  const [perfil, setPerfil] = useState(null)
  const [cargandoPerfil, setCargandoPerfil] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      try {
        const { data } = await api.get('/auth/me')
        setPerfil(data)
        setInfoForm({ nombre: data.nombre, apellido: data.apellido })
      } catch {
        /* usa datos del token si /me falla */
        if (usuario) {
          setPerfil(usuario)
          setInfoForm({ nombre: usuario.nombre || '', apellido: usuario.apellido || '' })
        }
      } finally {
        setCargandoPerfil(false)
      }
    }
    cargar()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Sección info ── */
  const [infoForm, setInfoForm] = useState({ nombre: '', apellido: '' })
  const [guardandoInfo, setGuardandoInfo] = useState(false)

  const guardarInfo = async (e) => {
    e.preventDefault()
    const nombre = infoForm.nombre.trim()
    const apellido = infoForm.apellido.trim()
    if (!nombre || !apellido) {
      toast.error('Nombre y apellido son requeridos')
      return
    }
    setGuardandoInfo(true)
    try {
      const { data } = await api.patch('/auth/me', { nombre, apellido })
      setPerfil(prev => ({ ...prev, nombre: data.nombre, apellido: data.apellido }))
      actualizarUsuario({ nombre: data.nombre, apellido: data.apellido })
      toast.success('Perfil actualizado correctamente')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al actualizar el perfil')
    } finally {
      setGuardandoInfo(false)
    }
  }

  /* ── Sección seguridad ── */
  const [pwForm, setPwForm] = useState({ actual: '', nueva: '', confirmar: '' })
  const [mostrarPw, setMostrarPw] = useState({ actual: false, nueva: false, confirmar: false })
  const [guardandoPw, setGuardandoPw] = useState(false)
  const [pwExito, setPwExito] = useState(false)

  const togglePw = (campo) => setMostrarPw(p => ({ ...p, [campo]: !p[campo] }))

  const cambiarPassword = async (e) => {
    e.preventDefault()
    if (pwForm.nueva.length < 8) {
      toast.error('La nueva contraseña debe tener al menos 8 caracteres')
      return
    }
    if (pwForm.nueva !== pwForm.confirmar) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    setGuardandoPw(true)
    try {
      await api.post('/auth/cambiar-password', {
        password_actual: pwForm.actual,
        password_nueva: pwForm.nueva,
      })
      setPwForm({ actual: '', nueva: '', confirmar: '' })
      setPwExito(true)
      toast.success('Contraseña cambiada correctamente')
      setTimeout(() => setPwExito(false), 4000)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al cambiar la contraseña')
    } finally {
      setGuardandoPw(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const datos = perfil || usuario
  const rolConfig = ROL_COLOR[datos?.rol] || ROL_COLOR.analista

  if (cargandoPerfil) {
    return (
      <div className="p-6 animate-fade-in">
        <div className="max-w-2xl mx-auto space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card">
              <div className="skeleton h-4 w-1/3 mb-3" />
              <div className="skeleton h-3 w-full mb-2" />
              <div className="skeleton h-3 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 animate-fade-in">
      <div className="max-w-2xl mx-auto">
        {/* Header del perfil */}
        <div className="card mb-6">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold font-syne flex-shrink-0"
              style={{ background: 'rgba(0,255,106,0.12)', color: '#00FF6A', border: '2px solid rgba(0,255,106,0.2)' }}
              aria-hidden="true"
            >
              {iniciales(datos?.nombre, datos?.apellido)}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold font-syne truncate" style={{ color: 'var(--color-text-primary)' }}>
                {datos?.nombre} {datos?.apellido}
              </h1>
              <p className="text-sm font-dm mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                {datos?.email}
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span
                  className="text-xs font-dm px-2 py-0.5 font-medium"
                  style={{ background: rolConfig.bg, color: rolConfig.color, borderRadius: 4 }}
                >
                  {ROL_LABEL[datos?.rol] || datos?.rol}
                </span>
                {perfil?.created_at && (
                  <span className="text-xs font-dm" style={{ color: '#444' }}>
                    Miembro desde {new Date(perfil.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long' })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mi información */}
        <section className="card mb-6" aria-labelledby="seccion-info">
          <div className="flex items-center gap-2 mb-5" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
            <User size={16} style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
            <h2 id="seccion-info" className="font-syne font-semibold text-base" style={{ color: 'var(--color-text-primary)' }}>
              Mi información
            </h2>
          </div>

          <form onSubmit={guardarInfo} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-dm mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Nombre <span style={{ color: 'var(--color-accent)' }}>*</span>
                </label>
                <input
                  className="input text-sm"
                  value={infoForm.nombre}
                  onChange={e => setInfoForm(p => ({ ...p, nombre: e.target.value }))}
                  required
                  placeholder="Juan"
                />
              </div>
              <div>
                <label className="block text-xs font-dm mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Apellido <span style={{ color: 'var(--color-accent)' }}>*</span>
                </label>
                <input
                  className="input text-sm"
                  value={infoForm.apellido}
                  onChange={e => setInfoForm(p => ({ ...p, apellido: e.target.value }))}
                  required
                  placeholder="García"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-dm mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                Email
              </label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#444' }} aria-hidden="true" />
                <input
                  className="input text-sm pl-9"
                  value={datos?.email || ''}
                  readOnly
                  aria-label="Email (no editable)"
                  style={{ color: '#555', cursor: 'not-allowed' }}
                />
              </div>
              <p className="text-xs font-dm mt-1" style={{ color: '#444' }}>El email no se puede cambiar</p>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={guardandoInfo}
                className="btn-primary flex items-center gap-2 text-sm px-5 py-2.5"
              >
                <Save size={14} aria-hidden="true" />
                {guardandoInfo ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </section>

        {/* Seguridad */}
        <section className="card mb-6" aria-labelledby="seccion-seguridad">
          <div className="flex items-center gap-2 mb-5" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
            <Shield size={16} style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
            <h2 id="seccion-seguridad" className="font-syne font-semibold text-base" style={{ color: 'var(--color-text-primary)' }}>
              Seguridad
            </h2>
          </div>

          {pwExito && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 mb-4 text-xs font-dm"
              style={{ background: 'rgba(0,255,106,0.08)', border: '1px solid rgba(0,255,106,0.2)', borderRadius: 6, color: '#00FF6A' }}
              role="status"
            >
              <CheckCircle size={14} aria-hidden="true" />
              Contraseña actualizada correctamente
            </div>
          )}

          <form onSubmit={cambiarPassword} className="space-y-4">
            {[
              { id: 'actual',    label: 'Contraseña actual',         campo: 'actual' },
              { id: 'nueva',     label: 'Nueva contraseña',          campo: 'nueva',    hint: 'Mínimo 8 caracteres' },
              { id: 'confirmar', label: 'Confirmar nueva contraseña', campo: 'confirmar' },
            ].map(({ id, label, campo, hint }) => (
              <div key={id}>
                <label htmlFor={`pw-${id}`} className="block text-xs font-dm mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {label}
                </label>
                <div className="relative">
                  <KeyRound size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#444' }} aria-hidden="true" />
                  <input
                    id={`pw-${id}`}
                    type={mostrarPw[campo] ? 'text' : 'password'}
                    className="input text-sm pl-9 pr-10"
                    value={pwForm[campo]}
                    onChange={e => setPwForm(p => ({ ...p, [campo]: e.target.value }))}
                    required
                    autoComplete={campo === 'actual' ? 'current-password' : 'new-password'}
                    style={{
                      borderColor: campo !== 'actual' && pwForm.nueva && pwForm.confirmar && pwForm.nueva !== pwForm.confirmar
                        ? 'rgba(255,68,85,0.5)' : undefined
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => togglePw(campo)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#444' }}
                    aria-label={mostrarPw[campo] ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    onMouseOver={e => e.currentTarget.style.color = 'var(--color-text-primary)'}
                    onMouseOut={e => e.currentTarget.style.color = '#444'}
                  >
                    {mostrarPw[campo] ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />}
                  </button>
                </div>
                {hint && <p className="text-xs font-dm mt-1" style={{ color: '#444' }}>{hint}</p>}
                {campo === 'confirmar' && pwForm.nueva && pwForm.confirmar && pwForm.nueva !== pwForm.confirmar && (
                  <p className="text-xs font-dm mt-1" style={{ color: 'var(--color-danger)' }}>Las contraseñas no coinciden</p>
                )}
              </div>
            ))}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={guardandoPw}
                className="btn-primary flex items-center gap-2 text-sm px-5 py-2.5"
              >
                <Shield size={14} aria-hidden="true" />
                {guardandoPw ? 'Cambiando...' : 'Cambiar contraseña'}
              </button>
            </div>
          </form>
        </section>

        {/* Sesión activa */}
        <section className="card" aria-labelledby="seccion-sesion">
          <div className="flex items-center gap-2 mb-5" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
            <LogOut size={16} style={{ color: 'var(--color-danger)' }} aria-hidden="true" />
            <h2 id="seccion-sesion" className="font-syne font-semibold text-base" style={{ color: 'var(--color-text-primary)' }}>
              Sesión activa
            </h2>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-dm" style={{ color: 'var(--color-text-primary)' }}>
                Sesión iniciada en este dispositivo
              </p>
              <p className="text-xs font-dm mt-0.5" style={{ color: '#444' }}>
                {datos?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm font-dm px-4 py-2 transition-colors"
              style={{ border: '1px solid rgba(255,68,85,0.3)', borderRadius: 6, color: '#FF6B7A', background: 'rgba(255,68,85,0.06)' }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,68,85,0.12)'; e.currentTarget.style.borderColor = 'rgba(255,68,85,0.5)' }}
              onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,68,85,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,68,85,0.3)' }}
            >
              <LogOut size={14} aria-hidden="true" />
              Cerrar sesión
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
