import { createContext, useContext, useState, useCallback } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    try {
      const saved = localStorage.getItem('wafeai_usuario')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  const login = useCallback(async (email, password) => {
    setCargando(true)
    setError(null)
    try {
      const form = new URLSearchParams()
      form.append('username', email)
      form.append('password', password)

      const { data } = await api.post('/auth/login', form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })

      localStorage.setItem('wafeai_token', data.access_token)
      localStorage.setItem('wafeai_usuario', JSON.stringify(data.usuario))
      setUsuario(data.usuario)
      return { ok: true }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al iniciar sesión'
      setError(msg)
      return { ok: false, error: msg }
    } finally {
      setCargando(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('wafeai_token')
    localStorage.removeItem('wafeai_usuario')
    setUsuario(null)
  }, [])

  const actualizarUsuario = useCallback((nuevosDatos) => {
    setUsuario(prev => {
      const actualizado = { ...prev, ...nuevosDatos }
      localStorage.setItem('wafeai_usuario', JSON.stringify(actualizado))
      return actualizado
    })
  }, [])

  return (
    <AuthContext.Provider value={{ usuario, login, logout, actualizarUsuario, cargando, error, autenticado: !!usuario }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
