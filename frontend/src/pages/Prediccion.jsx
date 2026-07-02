import { useState, useEffect } from 'react'
import { Brain, Loader2, AlertTriangle, CheckCircle, TrendingUp, Download } from 'lucide-react'
import RiskBadge from '../components/RiskBadge'
import { useToast } from '../context/ToastContext'
import api from '../api/client'

/* Demo: socio AL DÍA pero con señales conductuales de alto riesgo.
   dias_mora = 0 demuestra predicción real, no reacción a mora existente. */
const FORM_DEMO = {
  dias_mora: 0, monto_pendiente: 18000000, ratio_cumplimiento: 0.45,
  num_creditos: 4, tipo_credito: 'consumo', meses_cliente: 8, porcentaje_deuda: 0.88,
}

export default function Prediccion() {
  const toast = useToast()
  const [form, setForm] = useState(FORM_DEMO)
  const [resultado, setResultado] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [recalcCargando, setRecalcCargando] = useState(false)
  const [recalcMsg, setRecalcMsg] = useState(null)

  const calcularScore = async (formData) => {
    setCargando(true)
    setResultado(null)
    try {
      const { data } = await api.post('/prediccion/calcular', {
        ...formData,
        monto_pendiente: Number(formData.monto_pendiente),
        ratio_cumplimiento: Number(formData.ratio_cumplimiento),
        dias_mora: Number(formData.dias_mora),
        num_creditos: Number(formData.num_creditos),
        meses_cliente: Number(formData.meses_cliente),
        porcentaje_deuda: Number(formData.porcentaje_deuda),
      })
      setResultado(data)
    } catch {
      toast.error('Error al calcular el score. Verifica la conexión.')
    } finally {
      setCargando(false)
    }
  }

  /* Auto-calcular al entrar a la página */
  useEffect(() => { calcularScore(FORM_DEMO) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const calcular = async (e) => {
    e.preventDefault()
    calcularScore(form)
  }

  const recalcularTodos = async () => {
    setRecalcCargando(true)
    setRecalcMsg(null)
    try {
      const { data } = await api.post('/prediccion/recalcular-todos')
      setRecalcMsg({ tipo: 'ok', texto: data.mensaje })
    } catch (err) {
      setRecalcMsg({ tipo: 'error', texto: err.response?.data?.detail || 'Error al recalcular' })
    } finally {
      setRecalcCargando(false)
    }
  }

  const scoreColor = resultado
    ? resultado.nivel_riesgo === 'alto' ? '#EF4444'
    : resultado.nivel_riesgo === 'medio' ? '#F59E0B'
    : '#00E5A0'
    : '#00E5A0'

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold font-syne flex items-center gap-3" style={{ color: 'var(--color-text-primary)' }}>
            <Brain size={20} className="text-[#00E5A0]" aria-hidden="true" /> Predicción IA
          </h1>
          <p className="font-dm text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Modelo Gradient Boosting — Riesgo de incumplimiento crediticio</p>
        </div>
        <button
          onClick={recalcularTodos}
          disabled={recalcCargando}
          className="btn-ghost flex items-center gap-2 text-sm py-2"
        >
          {recalcCargando ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
          Recalcular todos
        </button>
      </div>

      {recalcMsg && (
        <div className={`mb-6 p-4 rounded-lg border text-sm font-dm flex items-center gap-2 ${
          recalcMsg.tipo === 'ok'
            ? 'bg-[#00E5A0]/10 border-[#00E5A0]/20 text-[#00E5A0]'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {recalcMsg.tipo === 'ok' ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
          {recalcMsg.texto}
        </div>
      )}

      {/* Texto explicativo */}
      <div className="mb-6 px-4 py-3 rounded-lg text-sm font-dm" style={{ background: 'rgba(0,229,160,0.04)', border: '1px solid rgba(0,229,160,0.12)', color: '#888' }}>
        <span className="text-[#F0F0EB] font-medium">¿Cómo funciona?</span>{' '}
        El modelo analiza el comportamiento crediticio del socio — historial de pagos, deuda acumulada, antigüedad — y predice la probabilidad de incumplimiento en los próximos 60 días,{' '}
        <span className="text-[#00E5A0]">incluso cuando el socio está al día</span>. Así puedes intervenir antes de que ocurra la mora.
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Formulario */}
        <div className="card">
          <h2 className="font-syne font-semibold text-[#F0F0EB] mb-1">Calcular score manual</h2>
          <p className="text-[#555] text-xs font-dm mb-5">Ingresa los datos del socio para predecir su riesgo</p>

          <div className="mb-4 px-4 py-3 rounded-r-md text-xs font-dm" style={{ borderLeft: '3px solid #00E5A0', background: 'rgba(0,229,160,0.04)', color: '#888' }}>
            <span className="font-semibold" style={{ color: '#00E5A0' }}>Demo predictivo:</span>{' '}
            este socio tiene <strong style={{ color: 'var(--color-text-primary)' }}>0 días de mora</strong> — está al día. El modelo detecta señales conductuales de riesgo futuro.
          </div>

          <form onSubmit={calcular} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#888] font-dm mb-1.5">Días en mora actual</label>
                <input type="number" className="input text-sm" min="0" value={form.dias_mora}
                  onChange={e => setForm(p => ({ ...p, dias_mora: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-[#888] font-dm mb-1.5">Saldo pendiente (COP)</label>
                <input type="number" className="input text-sm" min="0" value={form.monto_pendiente}
                  onChange={e => setForm(p => ({ ...p, monto_pendiente: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-[#888] font-dm mb-1.5">Ratio cumplimiento (0-1)</label>
                <input type="number" className="input text-sm" min="0" max="1" step="0.01" value={form.ratio_cumplimiento}
                  onChange={e => setForm(p => ({ ...p, ratio_cumplimiento: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-[#888] font-dm mb-1.5">Créditos activos</label>
                <input type="number" className="input text-sm" min="1" max="10" value={form.num_creditos}
                  onChange={e => setForm(p => ({ ...p, num_creditos: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-[#888] font-dm mb-1.5">Tipo de crédito</label>
                <select className="input text-sm" value={form.tipo_credito}
                  onChange={e => setForm(p => ({ ...p, tipo_credito: e.target.value }))}>
                  <option value="microcredito">Microcrédito</option>
                  <option value="consumo">Consumo</option>
                  <option value="vivienda">Vivienda</option>
                  <option value="empresarial">Empresarial</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#888] font-dm mb-1.5">Meses como cliente</label>
                <input type="number" className="input text-sm" min="1" value={form.meses_cliente}
                  onChange={e => setForm(p => ({ ...p, meses_cliente: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-[#888] font-dm mb-1.5">% Deuda vs original (0-1)</label>
                <input type="range" className="w-full accent-[#00E5A0]" min="0" max="1" step="0.05"
                  value={form.porcentaje_deuda}
                  onChange={e => setForm(p => ({ ...p, porcentaje_deuda: e.target.value }))} />
                <div className="flex justify-between text-xs text-[#555] font-dm mt-1">
                  <span>0%</span>
                  <span className="text-[#00E5A0]">{(form.porcentaje_deuda * 100).toFixed(0)}%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            <button type="submit" disabled={cargando} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
              {cargando ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
              {cargando ? 'Procesando...' : 'Calcular Score de Riesgo'}
            </button>
          </form>
        </div>

        {/* Resultado */}
        <div className="card flex flex-col min-h-[480px]">
          {!resultado ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-[#333]">
                <Brain size={48} className="mx-auto mb-3 opacity-30" />
                <p className="font-dm text-sm">Ingresa los datos y calcula el score</p>
              </div>
            </div>
          ) : (
            <div className="w-full animate-slide-up">
              {/* Velocímetro visual */}
              <div className="text-center mb-6">
                <div className="relative inline-flex items-center justify-center">
                  <svg viewBox="0 0 200 120" className="w-52">
                    {/* Fondo del arco */}
                    <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#1A1A1A" strokeWidth="16" strokeLinecap="round" />
                    {/* Arco de progreso */}
                    <path
                      d="M 20 100 A 80 80 0 0 1 180 100"
                      fill="none"
                      stroke={scoreColor}
                      strokeWidth="16"
                      strokeLinecap="round"
                      strokeDasharray={`${(resultado.score_riesgo / 100) * 251} 251`}
                    />
                  </svg>
                  <div className="absolute bottom-2 text-center">
                    <div className="text-4xl font-bold font-syne" style={{ color: scoreColor }}>
                      {resultado.score_riesgo}%
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <RiskBadge nivel={resultado.nivel_riesgo} showScore={false} />
                </div>
              </div>

              {/* Detalles */}
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-[#1A1A1A]">
                  <span className="text-[#888] text-sm font-dm">Probabilidad de incumplimiento</span>
                  <span className="font-syne font-semibold" style={{ color: scoreColor }}>
                    {(resultado.probabilidad_incumplimiento * 100).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <p className="text-[#888] text-xs font-dm mb-2">Factores de riesgo detectados:</p>
                  <div className="space-y-1.5">
                    {resultado.factores_riesgo.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs font-dm">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: scoreColor }} />
                        <span className="text-[#F0F0EB]">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ventana de intervención */}
                {resultado.nivel_riesgo === 'alto' && (
                  <div className="mt-3 p-3 rounded-lg bg-[#FF4455]/10 border border-[#FF4455]/20 flex items-center justify-between">
                    <div className="text-xs font-dm text-red-300">
                      <span className="text-base mr-1" aria-hidden="true">⏱</span>
                      <strong>Ventana de intervención</strong>
                    </div>
                    <span className="text-lg font-bold font-syne text-[#FF6B7A]">~38 días</span>
                  </div>
                )}
                {resultado.nivel_riesgo === 'medio' && (
                  <div className="mt-3 p-3 rounded-lg bg-[#FFB800]/10 border border-[#FFB800]/20 flex items-center justify-between">
                    <div className="text-xs font-dm text-yellow-300">
                      <span className="text-base mr-1" aria-hidden="true">⏱</span>
                      <strong>Ventana de intervención</strong>
                    </div>
                    <span className="text-lg font-bold font-syne text-yellow-400">~60 días</span>
                  </div>
                )}

                {/* Recomendación */}
                <div className={`mt-3 p-3 rounded-lg border text-xs font-dm ${
                  resultado.nivel_riesgo === 'alto'
                    ? 'bg-red-500/10 border-red-500/20 text-red-300'
                    : resultado.nivel_riesgo === 'medio'
                    ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300'
                    : 'bg-[#00E5A0]/10 border-[#00E5A0]/20 text-[#00E5A0]'
                }`}>
                  <strong>Recomendación: </strong>
                  {resultado.nivel_riesgo === 'alto'
                    ? 'Intervenir YA — este socio está al día HOY pero entrará en mora en ~38 días. Contactar y reestructurar antes de que ocurra.'
                    : resultado.nivel_riesgo === 'medio'
                    ? 'Monitorear de cerca. Enviar recordatorio preventivo de pago en los próximos 15 días.'
                    : 'Perfil saludable. Mantener seguimiento periódico estándar.'}
                </div>

                {/* Guardar análisis */}
                <button
                  onClick={() => {
                    const lineas = [
                      `Score de riesgo: ${resultado.score_riesgo}%`,
                      `Nivel: ${resultado.nivel_riesgo}`,
                      `Probabilidad incumplimiento: ${(resultado.probabilidad_incumplimiento * 100).toFixed(1)}%`,
                      `Factores: ${resultado.factores_riesgo.join(' | ')}`,
                      `Generado: ${new Date().toLocaleString('es-CO')}`,
                    ]
                    const blob = new Blob([lineas.join('\n')], { type: 'text/plain;charset=utf-8;' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `analisis-ia-${new Date().toISOString().slice(0,10)}.txt`
                    a.click()
                    URL.revokeObjectURL(url)
                    toast.success('Análisis guardado')
                  }}
                  className="btn-ghost w-full flex items-center justify-center gap-2 text-sm py-2.5 mt-4"
                >
                  <Download size={14} aria-hidden="true" /> Guardar análisis
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Metodología */}
      <div className="card mt-6">
        <h2 className="font-syne font-semibold text-[#F0F0EB] mb-4">Metodología del Modelo</h2>
        <div className="grid grid-cols-3 gap-6 text-sm font-dm">
          <div>
            <h3 className="text-[#00E5A0] font-medium mb-2">Algoritmo</h3>
            <p className="text-[#888]">Gradient Boosting Classifier entrenado con datos históricos de la cooperativa. Actualizable desde la BD.</p>
          </div>
          <div>
            <h3 className="text-[#00E5A0] font-medium mb-2">Variables</h3>
            <ul className="text-[#888] space-y-1">
              {['Días en mora', 'Saldo pendiente', 'Historial de pagos', 'Créditos activos', 'Tipo de crédito'].map(v => (
                <li key={v} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-[#333]" />{v}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-[#00E5A0] font-medium mb-2">Umbrales</h3>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2"><span className="badge-bajo">BAJO</span><span className="text-[#888]">0% — 40%</span></div>
              <div className="flex items-center gap-2"><span className="badge-medio">MEDIO</span><span className="text-[#888]">40% — 70%</span></div>
              <div className="flex items-center gap-2"><span className="badge-alto">ALTO</span><span className="text-[#888]">70% — 100%</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
