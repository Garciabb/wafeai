export default function Logo({ size = 'md' }) {
  const sizes = {
    sm: { w: 26, h: 18, textClass: 'text-lg' },
    md: { w: 36, h: 25, textClass: 'text-2xl' },
    lg: { w: 54, h: 38, textClass: 'text-4xl' },
  }
  const { w, h, textClass } = sizes[size] || sizes.md

  return (
    <div className="flex items-center gap-2.5">
      {/* Ícono SVG — doble-chevron geométrico */}
      <svg
        width={w}
        height={h}
        viewBox="0 0 88 62"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Banda izquierda exterior */}
        <path d="M4 5 L22 5 L50 57 L32 57 Z" fill="#F0F0EB"/>
        {/* Banda izquierda interior */}
        <path d="M28 5 L42 5 L50 57 L40 29 Z" fill="#F0F0EB"/>
        {/* Banda derecha — V */}
        <path d="M50 5 L70 5 L50 57 L40 29 Z" fill="#F0F0EB"/>
      </svg>

      {/* Wordmark */}
      <span className={`font-syne font-bold ${textClass} tracking-tight leading-none`}>
        <span className="text-[#F0F0EB]">WAFE</span>
        <span className="text-[#00FF6A]">AI</span>
      </span>
    </div>
  )
}
