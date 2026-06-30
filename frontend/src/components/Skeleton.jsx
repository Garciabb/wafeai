/* Skeleton loaders — reemplaza spinners genéricos */

export function SkeletonBlock({ className = '', style }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />
}

export function SkeletonKPI() {
  return (
    <div className="card" aria-busy="true" aria-label="Cargando indicador">
      <div className="flex items-start justify-between mb-3">
        <SkeletonBlock className="h-3 w-24" />
        <SkeletonBlock className="w-8 h-8" style={{ borderRadius: 6 }} />
      </div>
      <SkeletonBlock className="h-8 w-32 mb-2" />
      <SkeletonBlock className="h-2.5 w-40" />
    </div>
  )
}

export function SkeletonTableRow() {
  return (
    <tr aria-hidden="true">
      {[48, 24, 20, 20, 16, 20].map((w, i) => (
        <td key={i} className="px-5 py-3.5">
          <SkeletonBlock className="h-3" style={{ width: `${w * 2}px`, maxWidth: '100%' }} />
          {i === 0 && <SkeletonBlock className="h-2.5 mt-1.5 w-24" />}
        </td>
      ))}
    </tr>
  )
}

export function SkeletonTable({ rows = 6 }) {
  return (
    <tbody aria-busy="true" aria-label="Cargando datos">
      {Array.from({ length: rows }, (_, i) => <SkeletonTableRow key={i} />)}
    </tbody>
  )
}

export function SkeletonChart() {
  return (
    <div className="card" aria-busy="true" aria-label="Cargando gráfica">
      <SkeletonBlock className="h-4 w-36 mb-1" />
      <SkeletonBlock className="h-3 w-48 mb-6" />
      <SkeletonBlock className="h-52 w-full" style={{ borderRadius: 4 }} />
    </div>
  )
}
