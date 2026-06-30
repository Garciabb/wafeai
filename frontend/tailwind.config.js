/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Design tokens — única fuente de verdad
        wafe: {
          bg:        '#080808',
          surface:   '#111111',
          surface2:  '#161616',
          border:    '#1E1E1E',
          primary:   '#F0F0EB',
          secondary: '#888888',
          accent:    '#00E5A0',
          danger:    '#FF4455',
          warning:   '#FFB800',
        },
      },
      borderRadius: {
        // Enterprise scale: 4px buttons, 6px inputs, 8px cards
        DEFAULT: '4px',
        sm: '2px',
        md: '6px',
        lg: '8px',
        xl: '8px',   // override Tailwind — max 8px
        '2xl': '8px', // override — never more than 8px on cards
      },
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        dm: ['DM Sans', 'sans-serif'],
      },
      fontSize: {
        // Escala de 8px: 12 14 16 20 24 32 48
        'xs':  ['12px', { lineHeight: '1.4' }],
        'sm':  ['14px', { lineHeight: '1.4' }],
        'base':['16px', { lineHeight: '1.6' }],
        'xl':  ['20px', { lineHeight: '1.4' }],
        '2xl': ['24px', { lineHeight: '1.2' }],
        '3xl': ['32px', { lineHeight: '1.2' }],
        '5xl': ['48px', { lineHeight: '1.1' }],
      },
      animation: {
        'fade-in':  'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'skeleton': 'skeleton 1.4s ease-in-out infinite',
        // pulse-green ELIMINADO — era "AI look"
      },
      keyframes: {
        fadeIn:   { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:  { from: { transform: 'translateY(8px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        skeleton: { '0%, 100%': { opacity: '0.4' }, '50%': { opacity: '0.8' } },
      },
      boxShadow: {
        // Sombras sutiles — sin neón ni glow
        'sm': '0 1px 2px rgba(0,0,0,0.4)',
        DEFAULT: '0 1px 3px rgba(0,0,0,0.3)',
        'md': '0 2px 6px rgba(0,0,0,0.35)',
        'none': 'none',
      },
    },
  },
  plugins: [],
}
