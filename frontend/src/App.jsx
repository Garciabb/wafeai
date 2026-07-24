import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth, AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ClientProvider } from './context/ClientContext'
import Layout from './components/Layout'
import { SkeletonKPI } from './components/Skeleton'

// Lazy loading — cada ruta es un chunk separado
const Login      = lazy(() => import('./pages/Login'))
const Dashboard  = lazy(() => import('./pages/Dashboard'))
const Socios     = lazy(() => import('./pages/Socios'))
const Prediccion = lazy(() => import('./pages/Prediccion'))
const Cobranza   = lazy(() => import('./pages/Cobranza'))
const Alertas    = lazy(() => import('./pages/Alertas'))
const Simulador  = lazy(() => import('./pages/Simulador'))
const Perfil     = lazy(() => import('./pages/Perfil'))

function PageLoader() {
  return (
    <div className="p-8 grid grid-cols-2 xl:grid-cols-4 gap-4" aria-busy="true" aria-label="Cargando página">
      {[1,2,3,4].map(i => <SkeletonKPI key={i} />)}
    </div>
  )
}

function RutaProtegida({ children }) {
  const { autenticado } = useAuth()
  return autenticado ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
    <ClientProvider>
    <ToastProvider>
      <BrowserRouter>
        {/* Skip link — accesibilidad por teclado */}
        <a href="#main-content" className="skip-link">
          Ir al contenido principal
        </a>

        <Routes>
          <Route path="/login" element={
            <Suspense fallback={<div className="min-h-screen bg-[#080808]" />}>
              <Login />
            </Suspense>
          } />

          <Route path="/" element={
            <RutaProtegida>
              <Layout />
            </RutaProtegida>
          }>
            <Route index element={
              <Suspense fallback={<PageLoader />}><Dashboard /></Suspense>
            } />
            <Route path="socios" element={
              <Suspense fallback={<PageLoader />}><Socios /></Suspense>
            } />
            <Route path="prediccion" element={
              <Suspense fallback={<PageLoader />}><Prediccion /></Suspense>
            } />
            <Route path="cobranza" element={
              <Suspense fallback={<PageLoader />}><Cobranza /></Suspense>
            } />
            <Route path="alertas" element={
              <Suspense fallback={<PageLoader />}><Alertas /></Suspense>
            } />
            <Route path="simulador" element={
              <Suspense fallback={<PageLoader />}><Simulador /></Suspense>
            } />
            <Route path="perfil" element={
              <Suspense fallback={<PageLoader />}><Perfil /></Suspense>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
    </ClientProvider>
    </AuthProvider>
  )
}
