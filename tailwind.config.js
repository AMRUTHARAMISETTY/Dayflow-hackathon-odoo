/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#05070f',
          900: '#0a0e1a',
          800: '#0f1524',
        },
        navy: {
          950: '#060a17',
          900: '#0b1120',
          800: '#111a2e',
          700: '#182544',
        },
        accent: {
          500: '#3b6ef6',
          600: '#2f5adf',
          400: '#6c8cff',
        },
        violet: {
          500: '#7c6cf6',
          400: '#9a8cff',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        premium: '0 20px 60px -15px rgba(20, 30, 70, 0.35)',
        glow: '0 0 0 1px rgba(124,108,246,0.15), 0 20px 45px -10px rgba(59,110,246,0.35)',
      },
      backgroundImage: {
        'grid-slate': 'linear-gradient(to right, rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.08) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
}
