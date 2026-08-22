import { motion } from 'framer-motion'

export default function PageHeader({ eyebrow, title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <motion.p
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand-600"
          >
            {eyebrow}
          </motion.p>
        )}
        <motion.h1
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 }}
          className="text-2xl font-bold text-ink-900 font-display md:text-3xl"
        >
          {title}
        </motion.h1>
        {subtitle && <p className="mt-1 text-sm text-ink-900/50">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
