export default function RiskBadge({ nivel, score, showScore = false }) {
  const config = {
    alto:  { cls: 'badge-alto',  dot: '#FF4455', label: 'ALTO' },
    medio: { cls: 'badge-medio', dot: '#FFB800', label: 'MEDIO' },
    bajo:  { cls: 'badge-bajo',  dot: '#00FF6A', label: 'BAJO' },
  }
  const { cls, dot, label } = config[nivel] || config.bajo

  return (
    <span
      className={cls}
      aria-label={`Riesgo ${label}${showScore && score != null ? `, score ${score}%` : ''}`}
    >
      <span className="w-1.5 h-1.5" style={{ background: dot, borderRadius: 2 }} aria-hidden="true" />
      {label}
      {showScore && score != null && (
        <span aria-hidden="true" style={{ opacity: 0.7 }}>{score}%</span>
      )}
    </span>
  )
}
