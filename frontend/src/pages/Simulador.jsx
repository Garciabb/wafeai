import { useState, useMemo } from 'react'
import { Calculator, TrendingDown, TrendingUp, Clock, DollarSign, Mail } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const COSTO_ANUAL = 18_000_000 // COP fijo

const fmt = (n) => {
  if (!n || n === 0) return '$0'
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)         return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

const fmtAxis = (n) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(0)}M`
  return `${n}`
}

export default function Simulador() {
  const [cartera, setCartera]       = useState(5000)  // millones COP
  const [tasaMora, setTasaMora]     = useState(8.2)   // %
  const [interv, setInterv]         = useState(70)    // %
  const [recupero, setRecupero]     = useState(65)    // %

  const c = useMemo(() => {
    const total        = cartera * 1_000_000
    const perdidaActual  = total * (tasaMora / 100)
    const perdidaEvitable = perdidaActual * (interv / 100) * (recupero / 100)
    const perdidaResidual = perdidaActual - perdidaEvitable
    const roi            = perdidaEvitable > 0 ? perdidaEvitable / COSTO_ANUAL : 0
    const payback        = perdidaEvitable > 0 ? (COSTO_ANUAL / perdidaEvitable) * 12 : null
    return { perdidaActual, perdidaEvitable, perdidaResidual, roi, payback }
  }, [cartera, tasaMora, interv, recupero])

  const chartData = [
    { name: 'Sin WafeAI', valor: c.perdidaActual   },
    { name: 'Con WafeAI', valor: c.perdidaResidual },
  ]

  const mailBody = encodeURIComponent(
    `Hola, me interesa una demo de WafeAI.\n\nCartera: $${cartera}M COP · Mora: ${tasaMora}%\n\n¿Cuándo podemos hablar?`
  )
  const mailHref = `mailto:wafeai.jg@gmail.com?subject=${encodeURIComponent('Demo WafeAI — Calculadora ROI')}&body=${mailBody}`

  const fmtPayback = () => {
    if (c.payback === null) return '—'
    if (c.payback < 1) return '<1 mes'
    return `${c.payback.toFixed(1)} m`
  }

  const fmtRoi = () => {
    if (c.roi === 0) return '—'
    if (c.roi > 999) return '>999×'
    return `${c.roi.toFixed(1)}×`
  }

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold font-syne flex items-center gap-3" style={{ color: 'var(--color-text-primary)' }}>
          <Calculator size={20} className="text-[#00E5A0]" aria-hidden="true" />
          ¿Cuánto te cuesta NO tener WafeAI?
        </h1>
        <p className="text-sm mt-1 font-dm" style={{ color: 'var(--color-text-secondary)' }}>
          Calculadora de ROI — ajusta los valores de tu cooperativa y ve el impacto en tiempo real
        </p>
      </div>

      <div className="grid grid-cols-2 gap-8">

        {/* ── INPUTS ── */}
        <div className="card space-y-6">
          <div>
            <h2 className="font-syne font-semibold text-[#F0F0EB]">Datos de tu cooperativa</h2>
            <p className="text-xs font-dm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              Arrastra los sliders o edita los valores directamente
            </p>
          </div>

          {/* Cartera total */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-dm" style={{ color: 'var(--color-text-secondary)' }}>
                Cartera total
              </label>
              <div className="flex items-center gap-1">
                <span className="text-xs font-dm" style={{ color: 'var(--color-accent)' }}>$</span>
                <input
                  type="number" min="100" max="50000" step="100"
                  value={cartera}
                  onChange={e => setCartera(Math.max(100, Number(e.target.value)))}
                  className="input text-sm w-24 text-right py-1"
                  aria-label="Cartera total en millones COP"
                />
                <span className="text-xs font-dm" style={{ color: 'var(--color-text-secondary)' }}>M COP</span>
              </div>
            </div>
            <input
              type="range" min="100" max="50000" step="100"
              value={cartera}
              onChange={e => setCartera(Number(e.target.value))}
              className="w-full accent-[#00E5A0]"
              aria-label="Slider cartera total"
            />
            <div className="flex justify-between text-xs font-dm mt-1" style={{ color: '#444' }}>
              <span>$100M</span><span>$50.000M</span>
            </div>
          </div>

          {/* Tasa de mora */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-dm" style={{ color: 'var(--color-text-secondary)' }}>
                Tasa de mora actual
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number" min="0" max="30" step="0.1"
                  value={tasaMora}
                  onChange={e => setTasaMora(Math.min(30, Math.max(0, Number(e.target.value))))}
                  className="input text-sm w-20 text-right py-1"
                  aria-label="Tasa de mora en porcentaje"
                />
                <span className="text-xs font-dm" style={{ color: 'var(--color-text-secondary)' }}>%</span>
              </div>
            </div>
            <input
              type="range" min="0" max="30" step="0.1"
              value={tasaMora}
              onChange={e => setTasaMora(Number(e.target.value))}
              className="w-full accent-[#00E5A0]"
            />
            <div className="flex justify-between text-xs font-dm mt-1" style={{ color: '#444' }}>
              <span>0%</span>
              <span style={{ color: '#FFB800' }}>Sector col. 4.1%</span>
              <span>30%</span>
            </div>
          </div>

          {/* Socios intervenibles */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-dm" style={{ color: 'var(--color-text-secondary)' }}>
                Socios en riesgo que se pueden intervenir
              </label>
              <span className="text-sm font-syne font-semibold" style={{ color: 'var(--color-accent)' }}>
                {interv}%
              </span>
            </div>
            <input
              type="range" min="10" max="100" step="5"
              value={interv}
              onChange={e => setInterv(Number(e.target.value))}
              className="w-full accent-[#00E5A0]"
            />
            <div className="flex justify-between text-xs font-dm mt-1" style={{ color: '#444' }}>
              <span>10%</span><span>100%</span>
            </div>
          </div>

          {/* Tasa de recupero */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-dm" style={{ color: 'var(--color-text-secondary)' }}>
                Tasa de recupero con intervención temprana
              </label>
              <span className="text-sm font-syne font-semibold" style={{ color: 'var(--color-accent)' }}>
                {recupero}%
              </span>
            </div>
            <input
              type="range" min="10" max="95" step="5"
              value={recupero}
              onChange={e => setRecupero(Number(e.target.value))}
              className="w-full accent-[#00E5A0]"
            />
            <div className="flex justify-between text-xs font-dm mt-1" style={{ color: '#444' }}>
              <span>10%</span><span>95%</span>
            </div>
          </div>

          {/* Costo fijo */}
          <div
            className="px-4 py-3 rounded"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-dm" style={{ color: 'var(--color-text-secondary)' }}>
                Costo WafeAI / año (fijo)
              </span>
              <span className="text-sm font-syne font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                $18M COP
              </span>
            </div>
          </div>
        </div>

        {/* ── OUTPUTS ── */}
        <div className="space-y-4">

          {/* 4 KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown size={13} style={{ color: 'var(--color-danger)' }} aria-hidden="true" />
                <span className="text-xs font-dm" style={{ color: 'var(--color-text-secondary)' }}>
                  Pérdida anual actual
                </span>
              </div>
              <p className="text-2xl font-bold font-syne" style={{ color: '#FF6B7A' }}>
                {fmt(c.perdidaActual)}
              </p>
              <p className="text-xs font-dm mt-1" style={{ color: '#444' }}>Sin intervención temprana</p>
            </div>

            <div className="card">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={13} style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
                <span className="text-xs font-dm" style={{ color: 'var(--color-text-secondary)' }}>
                  Pérdida evitable
                </span>
              </div>
              <p className="text-2xl font-bold font-syne" style={{ color: 'var(--color-accent)' }}>
                {fmt(c.perdidaEvitable)}
              </p>
              <p className="text-xs font-dm mt-1" style={{ color: '#444' }}>Con WafeAI este año</p>
            </div>

            <div className="card">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={13} style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
                <span className="text-xs font-dm" style={{ color: 'var(--color-text-secondary)' }}>
                  ROI estimado
                </span>
              </div>
              <p className="text-2xl font-bold font-syne" style={{ color: 'var(--color-accent)' }}>
                {fmtRoi()}
              </p>
              <p className="text-xs font-dm mt-1" style={{ color: '#444' }}>Retorno sobre inversión</p>
            </div>

            <div className="card">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={13} style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
                <span className="text-xs font-dm" style={{ color: 'var(--color-text-secondary)' }}>
                  Payback period
                </span>
              </div>
              <p className="text-2xl font-bold font-syne" style={{ color: 'var(--color-accent)' }}>
                {fmtPayback()}
              </p>
              <p className="text-xs font-dm mt-1" style={{ color: '#444' }}>Para recuperar la inversión</p>
            </div>
          </div>

          {/* Bar chart */}
          <div className="card">
            <h3 className="font-syne font-semibold text-sm mb-0.5" style={{ color: 'var(--color-text-primary)' }}>
              Comparativa de pérdidas anuales
            </h3>
            <p className="text-xs font-dm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Pérdida proyectada · COP
            </p>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={chartData} barSize={64} role="img" aria-label="Gráfica comparativa Sin vs Con WafeAI">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 12, fontFamily: 'DM Sans' }} />
                <YAxis tickFormatter={fmtAxis} tick={{ fill: '#666', fontSize: 11, fontFamily: 'DM Sans' }} width={52} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    fontFamily: 'DM Sans',
                    fontSize: 12,
                    color: 'var(--color-text-primary)',
                  }}
                  formatter={(v) => [fmt(v), 'Pérdida']}
                />
                <Bar dataKey="valor" radius={[3, 3, 0, 0]}>
                  <Cell fill="#FF4455" />
                  <Cell fill="#00E5A0" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-6 mt-2">
              <span className="flex items-center gap-2 text-xs font-dm" style={{ color: 'var(--color-text-secondary)' }}>
                <span className="w-3 h-2 rounded-sm inline-block" style={{ background: '#FF4455' }} aria-hidden="true" />
                Sin WafeAI
              </span>
              <span className="flex items-center gap-2 text-xs font-dm" style={{ color: 'var(--color-text-secondary)' }}>
                <span className="w-3 h-2 rounded-sm inline-block" style={{ background: '#00E5A0' }} aria-hidden="true" />
                Con WafeAI
              </span>
            </div>
          </div>

          {/* CTA */}
          <a
            href={mailHref}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold"
            style={{ textDecoration: 'none', display: 'flex' }}
            aria-label="Agendar demo de WafeAI por correo"
          >
            <Mail size={15} aria-hidden="true" />
            Agendar demo →
          </a>
        </div>
      </div>
    </div>
  )
}
