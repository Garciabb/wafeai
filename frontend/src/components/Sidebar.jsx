import { NavLink, Link } from 'react-router-dom'
import { LayoutDashboard, Users, Brain, MessageSquare, Bell, Calculator, LogOut, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import Logo from './Logo'
import { useClient, CLIENT_CONFIGS } from '../context/ClientContext'

export default function Sidebar({ usuario, onLogout, alertasCount = 0 }) {
  const { config, clientTipo, cambiarCliente } = useClient()
  const [showClientMenu, setShowClientMenu] = useState(false)

  // Nav dinámico según módulos habilitados del cliente
  const allNav = [
    { to: '/',           icono: LayoutDashboard, label: 'Dashboard',      key: 'dashboard' },
    { to: '/alertas',    icono: Bell,             label: 'Alertas',        key: 'alertas' },
    { to: '/socios',     icono: Users,            label: config.terminos.socios.charAt(0).toUpperCase() + config.terminos.socios.slice(1), key: 'socios' },
    { to: '/prediccion', icono: Brain,            label: 'Predicción IA',  key: 'prediccion' },
    { to: '/cobranza',   icono: MessageSquare,    label: 'Cobranza',       key: 'cobranza' },
    { to: '/simulador',  icono: Calculator,       label: 'Simulador ROI',  key: 'simulador' },
  ]

  const nav = allNav.filter(n => config.modulos.includes(n.key))

  return (
    <aside
      className="w-64 h-screen flex flex-col fixed left-0 top-0 z-30"
      style={{ background: '#0A0A0A', borderRight: '1px solid var(--color-border)' }}
      aria-label="Navegación principal"
    >
      {/* Logo */}
      <div className="p-6" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <Logo size="md" />
        <p className="text-xs mt-1.5 font-dm" style={{ color: '#444' }}>
          Gestión Inteligente de {config.terminos.cartera.split(' ')[0] === 'portafolio' ? 'Portafolio' : 'Cartera'}
        </p>
      </div>

      {/* Selector de tipo de cliente — inline en sidebar */}
      <div className="px-3 pt-3 relative">
        <button
          onClick={() => setShowClientMenu(p => !p)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs font-dm transition-all"
          style={{
            background: 'rgba(0,255,106,0.06)',
            border: '1px solid rgba(0,255,106,0.2)',
            color: 'var(--color-accent)',
            cursor: 'pointer',
          }}
          aria-expanded={showClientMenu}
          aria-haspopup="listbox"
        >
          <span>{config.emoji}</span>
          <span className="flex-1 text-left truncate">{config.label}</span>
          <ChevronDown size={12} className={showClientMenu ? 'rotate-180' : ''} style={{ transition: 'transform 0.2s' }} />
        </button>

        {showClientMenu && (
          <div
            className="absolute left-3 right-3 top-full mt-1 z-50 py-1"
            style={{
              background: '#111',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            }}
            role="listbox"
            aria-label="Seleccionar tipo de cliente"
          >
            {Object.values(CLIENT_CONFIGS).map(cfg => (
              <button
                key={cfg.tipo}
                role="option"
                aria-selected={clientTipo === cfg.tipo}
                onClick={() => { cambiarCliente(cfg.tipo); setShowClientMenu(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-dm transition-colors text-left"
                style={{
                  background: clientTipo === cfg.tipo ? 'rgba(0,255,106,0.08)' : 'transparent',
                  color: clientTipo === cfg.tipo ? 'var(--color-accent)' : '#888',
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                <span>{cfg.emoji}</span>
                <span>{cfg.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto mt-2" aria-label="Secciones de la aplicación">
        {nav.map(({ to, icono: Icono, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={label}
            aria-current={undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-sm font-dm font-medium
               transition-colors duration-150 rounded border-l-2
               ${isActive
                 ? 'bg-[#00E5A0]/10 text-[#00E5A0] border-l-[#00E5A0]'
                 : 'text-[#888] hover:text-[#F0F0EB] hover:bg-[#161616] border-l-transparent'
               }`
            }
          >
            {({ isActive }) => (
              <>
                <Icono size={16} aria-hidden="true" />
                <span className="flex-1">{label}</span>
                {label === 'Alertas' && alertasCount > 0 && (
                  <span
                    className="text-white text-xs px-1.5 py-0.5 min-w-[20px] text-center font-dm font-semibold"
                    style={{ background: 'var(--color-danger)', borderRadius: 10 }}
                    aria-label={`${alertasCount} alertas no leídas`}
                  >
                    {alertasCount > 99 ? '99+' : alertasCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: 0 }} />

      {/* Usuario */}
      <div className="p-3">
        <div
          className="flex items-center gap-3 px-3 py-2.5"
          style={{ background: 'var(--color-surface-2)', borderRadius: 6 }}
        >
          <Link
            to="/perfil"
            className="flex items-center gap-3 flex-1 min-w-0 transition-opacity hover:opacity-80"
            aria-label="Ver perfil de usuario"
          >
            <div
              className="w-8 h-8 flex items-center justify-center text-sm font-bold font-syne flex-shrink-0"
              style={{
                background: 'rgba(0,229,160,0.12)',
                color: 'var(--color-accent)',
                borderRadius: '50%',
              }}
              aria-hidden="true"
            >
              {`${usuario?.nombre?.[0] || ''}${usuario?.apellido?.[0] || ''}`.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium font-dm truncate" style={{ color: 'var(--color-text-primary)' }}>
                {usuario?.nombre} {usuario?.apellido}
              </p>
              <p className="text-xs font-dm capitalize" style={{ color: 'var(--color-text-secondary)' }}>
                {usuario?.rol}
              </p>
            </div>
          </Link>
          <button
            onClick={onLogout}
            className="transition-colors duration-150 p-1 flex-shrink-0"
            style={{ color: '#555' }}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            onMouseOver={e => e.currentTarget.style.color = 'var(--color-danger)'}
            onMouseOut={e => e.currentTarget.style.color = '#555'}
          >
            <LogOut size={15} aria-hidden="true" />
          </button>
        </div>
        <p className="text-center font-dm mt-2" style={{ color: '#333', fontSize: 10 }}>
          v1.0 MVP · {config.emoji} {config.label}
        </p>
      </div>
    </aside>
  )
}
