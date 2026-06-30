import { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../hooks/useAuth'
import { useWebSocket } from '../hooks/useWebSocket'
import api from '../api/client'

export default function Layout() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const [alertasCount, setAlertasCount] = useState(0)

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
      <Sidebar usuario={usuario} onLogout={handleLogout} alertasCount={alertasCount} />
      {/* id="main-content" para el skip link */}
      <main
        id="main-content"
        className="flex-1 ml-64 min-h-screen overflow-auto"
        tabIndex={-1}
      >
        <Outlet />
      </main>
    </div>
  )
}
