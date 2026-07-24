import axios from 'axios'

// En dev, Vite hace proxy de /api al backend local (ver vite.config.js).
// En producción, frontend y backend viven en dominios distintos (p.ej. Render),
// así que VITE_API_URL debe apuntar a la URL completa del backend desplegado.
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api'

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

// Inyectar token JWT en cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('wafeai_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Manejar expiración de sesión
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('wafeai_token')
      localStorage.removeItem('wafeai_usuario')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
