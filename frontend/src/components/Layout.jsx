import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import Logo from './Logo'
import { useAuth } from '../context/AuthContext'
import { useWebSocket } from '../hooks/useWebSocket'
import api from '../api/client'

export default function Layout() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [alertasCount, setAlertasCount] = useState(0)
  const [sidebarAbierto, setSidebarAbierto] = useState(false)

  useEffect(() => { setSidebarAbierto(false) }, [location.pathname])

  const cargarContador = async () => {
    try {
      const { data } = await api.get('/alertas/contador')
      setAlertasCount(data.total)
    } catch { /* silencioso */ }
  }

  useWebSocket((msg) => {
    if (msg.tipo === 'nueva_alerta') setAlertasCount(p => p + 1)
  })

  useEffect(() => {
    cargarContador()
    const interval = setInterval(cargarContador, 60_000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <Sidebar
        usuario={usuario}
        onLogout={handleLogout}
        alertasCount={alertasCount}
        open={sidebarAbierto}
        onClose={() => setSidebarAbierto(false)}
      />

      {/* Barra superior móvil — solo visible por debajo de lg */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-20 flex items-center gap-3 px-4"
        style={{ height: 56, background: 'rgba(10,10,10,0.95)', borderBottom: '1px solid var(--color-border)', backdropFilter: 'blur(8px)' }}
      >
        <button
          onClick={() => setSidebarAbierto(true)}
          className="p-1.5 -ml-1.5"
          style={{ color: 'var(--color-text-primary)' }}
          aria-label="Abrir menú de navegación"
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        <Logo size="sm" />
      </div>

      {/* id="main-content" para el skip link */}
      <main
        id="main-content"
        className="flex-1 lg:ml-64 min-h-screen overflow-auto w-full pt-14 lg:pt-0"
        tabIndex={-1}
      >
        <Outlet />
      </main>
    </div>
  )
}
