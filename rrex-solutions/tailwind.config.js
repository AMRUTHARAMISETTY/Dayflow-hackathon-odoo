/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#0d0b09',
          900: '#1A1512',
          800: '#241d18',
          700: '#332821',
          600: '#453529',
        },
        amber: {
          600: '#a8632f',
          500: '#C97A3D',
          400: '#d99760',
          300: '#e6b48a',
          200: '#f0d2b4',
        },
        bronze: {
          700: '#5c3e28',
          600: '#6e4a2f',
          500: '#8B5E3C',
          400: '#a17650',
        },
        bone: {
          600: '#c9bca3',
          500: '#E8DCC8',
          400: '#efe6d6',
          300: '#f5efe3',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['"Manrope"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        amberGlow: '0 0 0 1px rgba(201,122,61,0.25), 0 20px 50px -12px rgba(201,122,61,0.35)',
        fossil: '0 20px 60px -20px rgba(0,0,0,0.6)',
        rim: 'inset 0 1px 0 rgba(232,220,200,0.06), 0 0 40px -8px rgba(201,122,61,0.4)',
      },
      backgroundImage: {
        'strata-grid':
          'linear-gradient(to right, rgba(232,220,200,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(232,220,200,0.05) 1px, transparent 1px)',
        'amber-radial': 'radial-gradient(circle, rgba(201,122,61,0.35), transparent 70%)',
      },
      animation: {
        pulseSlow: 'pulseSlow 4s ease-in-out infinite',
        drift: 'drift 12s ease-in-out infinite',
      },
      keyframes: {
        pulseSlow: {
          '0%, 100%': { opacity: 0.4 },
          '50%': { opacity: 1 },
        },
        drift: {
          '0%, 100%': { transform: 'translateY(0) translateX(0)' },
          '50%': { transform: 'translateY(-14px) translateX(6px)' },
        },
      },
    },
  },
  plugins: [],
}
