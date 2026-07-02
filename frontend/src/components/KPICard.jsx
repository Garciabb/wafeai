/* KPICard: tarjeta semántica de indicadores clave */
export default function KPICard({ titulo, valor, subtitulo, icono: Icono, acento = false }) {
  return (
    <article
      className="card"
      style={acento ? {
        borderColor: 'rgba(0,229,160,0.3)',
        background: 'rgba(0,229,160,0.04)',
        minHeight: 120,
      } : { minHeight: 120 }}
      aria-label={`${titulo}: ${valor}`}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-dm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          {titulo}
        </p>
        {Icono && (
          <div
            className="p-2"
            style={{
              background: acento ? 'rgba(0,229,160,0.1)' : 'var(--color-surface-2)',
              borderRadius: 6,
            }}
            aria-hidden="true"
          >
            <Icono size={14} style={{ color: acento ? 'var(--color-accent)' : '#444' }} />
          </div>
        )}
      </div>

      {/* Valor principal — Syne solo aquí en KPIs */}
      <p
        className="text-3xl font-bold font-syne"
        style={{ color: acento ? 'var(--color-accent)' : 'var(--color-text-primary)' }}
      >
        {valor}
      </p>

      {subtitulo && (
        <p className="text-xs mt-1.5 font-dm" style={{ color: 'var(--color-text-secondary)' }}>
          {subtitulo}
        </p>
      )}
    </article>
  )
}
