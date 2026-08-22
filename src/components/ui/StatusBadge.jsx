import { motion } from 'framer-motion'
import clsx from 'clsx'

const STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  present: 'bg-emerald-100 text-emerald-700',
  absent: 'bg-red-100 text-red-700',
  'half-day': 'bg-amber-100 text-amber-700',
  leave: 'bg-brand-100 text-brand-700',
}

export default function StatusBadge({ status, label }) {
  return (
    <motion.span
      layout
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize',
        STYLES[status] || 'bg-gray-100 text-gray-600',
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label || status}
    </motion.span>
  )
}
