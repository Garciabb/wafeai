import { useState, useEffect, useCallback } from 'react'
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Users, Brain, RefreshCw } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ReferenceLine,
} from 'recharts'
import KPICard from '../components/KPICard'
import RiskBadge from '../components/RiskBadge'
import { SkeletonKPI, SkeletonChart, SkeletonTable } from '../components/Skeleton'
import api from '../api/client'
import { useToast } from '../context/ToastContext'

const fmt = (n) => {
  if (!n) return '$0'
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

export default function Dashboard() {
  const toast = useToast()
  const [kpis, setKpis] = useState(null)
  const [evolucion, setEvolucion] = useState([])
  const [riesgoAlto, setRiesgoAlto] = useState([])
  const [actividad, setActividad] = useState([])
  const [distribucion, setDistribucion] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [actualizando, setActualizando] = useState(false)

  const cargarDatos = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true)
    else setActualizando(true)
    try {
      const [kpisR, evolR, riesgoR, actividadR, distR] = await Promise.all([
        api.get('/dashboard/kpis'),
        api.get('/dashboard/evolucion-cartera'),
        api.get('/dashboard/socios-alto-riesgo?limite=8'),
        api.get('/dashboard/actividad-reciente?limite=10'),
        api.get('/dashboard/resumen-riesgo'),
      ])
      setKpis(kpisR.data)
      setEvolucion(evolR.data)
      setRiesgoAlto(riesgoR.data)
      setActividad(actividadR.data)
      setDistribucion(distR.data)
      if (silencioso) toast.success('Dashboard actualizado')
    } catch {
      toast.error('Error al cargar el dashboard. Verifica la conexión.')
    } finally {
      setCargando(false)
      setActualizando(false)
    }
  }, [toast])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  const perdidaEvitable = riesgoAlto.reduce((sum, s) => sum + (s.saldo_pendiente || 0), 0)

  const pieData = distribucion ? [
    { name: 'Bajo',  value: distribucion.bajo.cantidad,  color: '#00E5A0' },
    { name: 'Medio', value: distribucion.medio.cantidad, color: '#FFB800' },
    { name: 'Alto',  value: distribucion.alto.cantidad,  color: '#FF4455' },
  ] : []

  return (
    <div className="p-8 animate-fade-in">
      {/* Header — h1 único por página */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-syne" style={{ color: 'var(--color-text-primary)' }}>
            Dashboard
          </h1>
          <p className="text-sm mt-1 font-dm" style={{ color: 'var(--color-text-secondary)' }}>
            Visión en tiempo real de tu cartera
          </p>
        </div>
        <button
          onClick={() => cargarDatos(true)}
          disabled={actualizando}
          className="btn-ghost flex items-center gap-2 text-sm py-2"
          aria-label="Actualizar datos del dashboard"
        >
          <RefreshCw size={13} className={actualizando ? 'animate-spin' : ''} aria-hidden="true" />
          Actualizar
        </button>
      </div>

      {/* KPIs */}
      <section aria-label="Indicadores clave de rendimiento">
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
          {cargando ? (
            [1,2,3,4,5].map(i => <SkeletonKPI key={i} />)
          ) : (
            <>
              <KPICard titulo="Cartera Total"       valor={fmt(kpis?.cartera_total || 0)}      subtitulo={`${kpis?.total_socios || 0} socios activos`}           icono={DollarSign} />
              <KPICard
                titulo="Cartera Vencida"
                valor={fmt(kpis?.cartera_vencida || 0)}
                subtitulo={`Tu mora: ${kpis?.porcentaje_mora || 0}% · Sector: 4.1%`}
                icono={AlertTriangle}
              />
              <KPICard titulo="Tasa de Recupero"    valor={`${kpis?.tasa_recupero || 0}%`}    subtitulo={`${fmt(kpis?.recupero_mes || 0)} recuperado este mes`} icono={TrendingUp} acento />
              <KPICard titulo="Alertas IA Activas"  valor={kpis?.alertas_activas || 0}         subtitulo={`${kpis?.socios_en_riesgo_alto || 0} en riesgo alto`}    icono={Brain} />
              {/* KPI de urgencia: dinero en riesgo accionable */}
              <KPICard
                titulo="Pérdida Evitable"
                valor={fmt(perdidaEvitable)}
                subtitulo="Saldo en riesgo ALTO · actúa hoy"
                icono={TrendingDown}
              />
            </>
          )}
        </div>
      </section>

      {/* Gráficas */}
      <section aria-label="Gráficas de cartera">
        <div className="grid grid-cols-3 gap-6 mb-8">
          {cargando ? (
            <>
              <div className="col-span-2"><SkeletonChart /></div>
              <SkeletonChart />
            </>
          ) : (
            <>
              {/* Evolución */}
              <div className="col-span-2 card">
                <h2 className="font-syne font-semibold text-base mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Evolución de Cartera
                </h2>
                <p className="text-xs font-dm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                  Últimos 6 meses — millones COP
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={evolucion} role="img" aria-label="Gráfica de evolución de cartera">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="mes" tick={{ fill: '#666', fontSize: 11, fontFamily: 'DM Sans' }} />
                    <YAxis tick={{ fill: '#666', fontSize: 11, fontFamily: 'DM Sans' }} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 6,
                        color: 'var(--color-text-primary)',
                        fontFamily: 'DM Sans',
                        fontSize: 12,
                      }}
                      formatter={(v) => [`$${v}M COP`]}
                    />
                    <Line type="monotone" dataKey="cartera_total"   stroke="var(--color-text-primary)" strokeWidth={1.5} dot={false} name="Total" />
                    <Line type="monotone" dataKey="cartera_vencida" stroke="var(--color-danger)"        strokeWidth={1.5} dot={false} name="Vencida" />
                    {/* Benchmark: mora sector cooperativo colombiano = 4.1% de cartera total */}
                    {evolucion.length > 0 && kpis?.cartera_total > 0 && (
                      <ReferenceLine
                        y={kpis.cartera_total * 0.041 / 1_000_000}
                        stroke="#888"
                        strokeDasharray="4 3"
                        strokeWidth={1}
                        label={{ value: 'Sector 4.1%', position: 'insideTopRight', fontSize: 10, fill: '#888', fontFamily: 'DM Sans' }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex gap-6 mt-3 flex-wrap" aria-label="Leyenda de la gráfica">
                  <span className="flex items-center gap-2 text-xs font-dm" style={{ color: 'var(--color-text-secondary)' }}>
                    <span className="w-3 h-px bg-[#F0F0EB] inline-block" aria-hidden="true" /> Cartera total
                  </span>
                  <span className="flex items-center gap-2 text-xs font-dm" style={{ color: 'var(--color-text-secondary)' }}>
                    <span className="w-3 h-px inline-block" style={{ background: 'var(--color-danger)' }} aria-hidden="true" /> Cartera vencida
                  </span>
                  <span className="flex items-center gap-2 text-xs font-dm" style={{ color: '#666' }}>
                    <span className="w-3 h-px inline-block border-t border-dashed border-[#666]" aria-hidden="true" /> Benchmark sector 4.1%
                  </span>
                </div>
              </div>

              {/* Distribución */}
              <div className="card">
                <h2 className="font-syne font-semibold text-base mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Distribución Riesgo
                </h2>
                <p className="text-xs font-dm mb-4" style={{ color: 'var(--color-text-secondary)' }}>Socios por nivel IA</p>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart role="img" aria-label="Gráfica de distribución de riesgo">
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={44} outerRadius={68} dataKey="value" paddingAngle={2}>
                      {pieData.map(e => <Cell key={e.name} fill={e.color} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 6,
                        fontFamily: 'DM Sans',
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {distribucion && (
                  <dl className="space-y-2 mt-2">
                    {[
                      { label: 'Bajo',  val: distribucion.bajo,  color: '#00E5A0' },
                      { label: 'Medio', val: distribucion.medio, color: '#FFB800' },
                      { label: 'Alto',  val: distribucion.alto,  color: '#FF4455' },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="flex items-center justify-between">
                        <dt className="flex items-center gap-2 text-xs font-dm" style={{ color: 'var(--color-text-secondary)' }}>
                          <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: color }} aria-hidden="true" />
                          {label}
                        </dt>
                        <dd className="text-xs font-medium font-dm" style={{ color }}>{val.cantidad} ({val.porcentaje}%)</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Tabla alto riesgo + feed */}
      <section aria-label="Socios en mayor riesgo y actividad reciente">
        <div className="grid grid-cols-3 gap-6">
          {/* Tabla */}
          <div className="col-span-2 card p-0 overflow-hidden">
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <h2 className="font-syne font-semibold text-base" style={{ color: 'var(--color-text-primary)' }}>
                Socios en Mayor Riesgo
              </h2>
              <p className="text-xs font-dm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Predicción IA</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" role="grid" aria-label="Tabla de socios con mayor riesgo">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    {['Socio', 'Ciudad', 'Score IA', 'Mora', 'Saldo'].map(h => (
                      <th key={h} scope="col" className="px-5 py-3 text-left text-xs font-medium font-dm"
                        style={{ color: 'var(--color-text-secondary)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                {cargando ? (
                  <SkeletonTable rows={5} />
                ) : riesgoAlto.length === 0 ? (
                  <tbody>
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-sm font-dm" style={{ color: 'var(--color-text-secondary)' }}>
                        No hay socios en riesgo alto
                      </td>
                    </tr>
                  </tbody>
                ) : (
                  <tbody>
                    {riesgoAlto.map(s => (
                      <tr key={s.id} className="transition-colors" style={{ borderBottom: '1px solid #0D0D0D' }}
                        onMouseOver={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
                        onMouseOut={e => e.currentTarget.style.background = ''}>
                        <td className="px-5 py-3">
                          <p className="font-medium font-dm text-sm" style={{ color: 'var(--color-text-primary)' }}>{s.nombre}</p>
                          <p className="text-xs font-dm" style={{ color: 'var(--color-text-secondary)' }}>{s.cedula}</p>
                        </td>
                        <td className="px-5 py-3 text-xs font-dm" style={{ color: 'var(--color-text-secondary)' }}>{s.ciudad}</td>
                        <td className="px-5 py-3"><RiskBadge nivel={s.nivel_riesgo} score={s.score_riesgo} showScore /></td>
                        <td className="px-5 py-3 text-xs font-dm" style={{ color: s.dias_mora > 30 ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}>
                          {s.dias_mora}d
                        </td>
                        <td className="px-5 py-3 text-sm font-syne font-semibold" style={{ color: 'var(--color-accent)' }}>
                          {fmt(s.saldo_pendiente)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>
          </div>

          {/* Feed actividad */}
          <div className="card">
            <h2 className="font-syne font-semibold text-base mb-4" style={{ color: 'var(--color-text-primary)' }}>
              Actividad Reciente
            </h2>
            {cargando ? (
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="flex gap-3">
                    <div className="skeleton w-2 h-2 rounded-full mt-1.5 flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="skeleton h-3 w-full" />
                      <div className="skeleton h-2.5 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : actividad.length === 0 ? (
              <p className="text-sm font-dm text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
                Sin actividad reciente
              </p>
            ) : (
              <ul className="space-y-3" aria-live="polite">
                {actividad.slice(0, 8).map(a => (
                  <li key={a.id} className="flex gap-3">
                    <span
                      className="w-1.5 h-1.5 rounded-sm mt-1.5 flex-shrink-0"
                      style={{
                        background: a.prioridad === 'urgente' ? 'var(--color-danger)' :
                                    a.prioridad === 'media'   ? 'var(--color-warning)' :
                                    'var(--color-accent)'
                      }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-dm leading-relaxed line-clamp-2" style={{ color: 'var(--color-text-primary)' }}>
                        {a.mensaje}
                      </p>
                      <p className="text-xs mt-0.5 font-dm" style={{ color: '#444' }}>
                        {a.fecha ? new Date(a.fecha).toLocaleDateString('es-CO') : '—'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
