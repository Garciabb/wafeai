import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
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
