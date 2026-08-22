import { motion } from 'framer-motion'

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-ink-950 flex items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="animate-blob absolute -top-32 -left-20 h-96 w-96 rounded-full bg-brand-600/40 blur-3xl" />
        <div
          className="animate-blob absolute top-40 right-0 h-96 w-96 rounded-full bg-accent-500/30 blur-3xl"
          style={{ animationDelay: '3s' }}
        />
        <div
          className="animate-blob absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl"
          style={{ animationDelay: '6s' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="glass-dark relative z-10 w-full max-w-md rounded-3xl p-8 shadow-2xl shadow-black/40"
      >
        <div className="mb-7 text-center">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 18 }}
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-400 text-xl font-bold text-white shadow-lg shadow-brand-500/30"
          >
            D
          </motion.div>
          <h1 className="text-2xl font-bold text-white font-display">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-white/50">{subtitle}</p>}
        </div>
        {children}
      </motion.div>
    </div>
  )
}
