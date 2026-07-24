import { createContext, useContext, useState } from 'react'

/* ─── Configuraciones por tipo de cliente ─────────────────────────────────── */
export const CLIENT_CONFIGS = {
  cooperativa: {
    tipo: 'cooperativa',
    label: 'Cooperativa Financiera',
    emoji: '🤝',
    institucion: 'Cooperativa Demo',
    entidad: 'cooperativa',
    // Terminología
    terminos: {
      socio: 'socio',
      socios: 'socios',
      cartera: 'cartera de crédito',
      mora: 'mora',
      entrar_mora: 'entrar en mora',
    },
    // KPIs del dashboard
    kpis: {
      total_socios: { label: 'Total Socios', icon: '👥' },
      en_riesgo: { label: 'En Riesgo', icon: '⚠️' },
      mora_actual: { label: 'Mora Actual', icon: '📉' },
      perdida_evitable: { label: 'Pérdida Evitable', icon: '💰' },
    },
    // Benchmark sectorial
    benchmark: {
      label: 'Promedio cooperativas Colombia',
      valor: 8.4,
      color: '#f59e0b',
    },
    // Módulos habilitados
    modulos: ['dashboard', 'socios', 'prediccion', 'alertas', 'cobranza', 'simulador'],
    // Color de acento (mantiene verde WafeAI)
    acento: '#00FF6A',
    // Sector para personalización
    sector: 'solidario',
  },

  caja: {
    tipo: 'caja',
    label: 'Caja de Compensación',
    emoji: '🏢',
    institucion: 'Caja Demo',
    entidad: 'caja de compensación',
    terminos: {
      socio: 'afiliado',
      socios: 'afiliados',
      cartera: 'cartera de crédito social',
      mora: 'incumplimiento',
      entrar_mora: 'incumplir',
    },
    kpis: {
      total_socios: { label: 'Total Afiliados', icon: '👥' },
      en_riesgo: { label: 'Afiliados en Riesgo', icon: '⚠️' },
      mora_actual: { label: 'Cartera Vencida', icon: '📉' },
      perdida_evitable: { label: 'Pérdida Evitable', icon: '💰' },
    },
    benchmark: {
      label: 'Promedio cajas de compensación',
      valor: 5.8,
      color: '#f59e0b',
    },
    modulos: ['dashboard', 'socios', 'prediccion', 'alertas', 'cobranza', 'simulador'],
    acento: '#00FF6A',
    sector: 'compensacion',
  },

  fintech: {
    tipo: 'fintech',
    label: 'Fintech / Crédito Digital',
    emoji: '⚡',
    institucion: 'Fintech Demo',
    entidad: 'fintech',
    terminos: {
      socio: 'cliente',
      socios: 'clientes',
      cartera: 'portafolio de crédito',
      mora: 'default',
      entrar_mora: 'defaultear',
    },
    kpis: {
      total_socios: { label: 'Clientes Activos', icon: '👥' },
      en_riesgo: { label: 'Riesgo Alto', icon: '⚠️' },
      mora_actual: { label: 'Default Rate', icon: '📉' },
      perdida_evitable: { label: 'Pérdida Evitable', icon: '💰' },
    },
    benchmark: {
      label: 'Promedio fintechs Colombia',
      valor: 12.1,
      color: '#f59e0b',
    },
    modulos: ['dashboard', 'socios', 'prediccion', 'alertas', 'simulador'],
    acento: '#00FF6A',
    sector: 'fintech',
    // Panel especial para fintechs
    mostrarAPI: true,
  },

  banco: {
    tipo: 'banco',
    label: 'Banco / Entidad Regulada',
    emoji: '🏦',
    institucion: 'Banco Demo',
    entidad: 'banco',
    terminos: {
      socio: 'deudor',
      socios: 'deudores',
      cartera: 'portafolio de crédito',
      mora: 'deterioro de cartera',
      entrar_mora: 'deteriorar',
    },
    kpis: {
      total_socios: { label: 'Deudores Activos', icon: '👥' },
      en_riesgo: { label: 'Categorías C-E (SARC)', icon: '⚠️' },
      mora_actual: { label: 'Cartera Vencida >30d', icon: '📉' },
      perdida_evitable: { label: 'Provisión Evitable', icon: '💰' },
    },
    benchmark: {
      label: 'Promedio sector bancario Colombia',
      valor: 4.2,
      color: '#f59e0b',
    },
    modulos: ['dashboard', 'socios', 'prediccion', 'alertas', 'cobranza', 'simulador'],
    acento: '#00FF6A',
    sector: 'bancario',
    mostrarSARC: true,
  },

  retail: {
    tipo: 'retail',
    label: 'Retail con Crédito Propio',
    emoji: '🛒',
    institucion: 'Retail Demo',
    entidad: 'retail',
    terminos: {
      socio: 'cliente',
      socios: 'clientes',
      cartera: 'cartera de crédito propio',
      mora: 'incumplimiento de pago',
      entrar_mora: 'incumplir',
    },
    kpis: {
      total_socios: { label: 'Clientes con Crédito', icon: '👥' },
      en_riesgo: { label: 'Clientes en Riesgo', icon: '⚠️' },
      mora_actual: { label: 'Mora Cartera', icon: '📉' },
      perdida_evitable: { label: 'Pérdida Evitable', icon: '💰' },
    },
    benchmark: {
      label: 'Promedio retail con crédito',
      valor: 9.7,
      color: '#f59e0b',
    },
    modulos: ['dashboard', 'socios', 'prediccion', 'alertas', 'simulador'],
    acento: '#00FF6A',
    sector: 'retail',
    mostrarPOS: true,
  },

  fondo: {
    tipo: 'fondo',
    label: 'Fondo de Empleados',
    emoji: '🤲',
    institucion: 'Fondo Demo',
    entidad: 'fondo de empleados',
    terminos: {
      socio: 'asociado',
      socios: 'asociados',
      cartera: 'cartera de libranza',
      mora: 'mora',
      entrar_mora: 'entrar en mora',
    },
    kpis: {
      total_socios: { label: 'Total Asociados', icon: '👥' },
      en_riesgo: { label: 'En Riesgo', icon: '⚠️' },
      mora_actual: { label: 'Mora Libranza', icon: '📉' },
      perdida_evitable: { label: 'Pérdida Evitable', icon: '💰' },
    },
    benchmark: {
      label: 'Promedio fondos de empleados',
      valor: 3.8,
      color: '#f59e0b',
    },
    modulos: ['dashboard', 'socios', 'prediccion', 'alertas'],
    acento: '#00FF6A',
    sector: 'fondo',
  },
}

/* ─── Context ─────────────────────────────────────────────────────────────── */
const ClientContext = createContext(null)

export function ClientProvider({ children }) {
  const [clientTipo, setClientTipo] = useState(
    () => localStorage.getItem('wafeai_client_tipo') || 'cooperativa'
  )

  const config = CLIENT_CONFIGS[clientTipo] || CLIENT_CONFIGS.cooperativa

  const cambiarCliente = (tipo) => {
    setClientTipo(tipo)
    localStorage.setItem('wafeai_client_tipo', tipo)
  }

  return (
    <ClientContext.Provider value={{ config, clientTipo, cambiarCliente, CLIENT_CONFIGS }}>
      {children}
    </ClientContext.Provider>
  )
}

export function useClient() {
  const ctx = useContext(ClientContext)
  if (!ctx) throw new Error('useClient debe usarse dentro de ClientProvider')
  return ctx
}
