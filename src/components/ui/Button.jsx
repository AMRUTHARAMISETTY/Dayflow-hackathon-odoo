import { motion } from 'framer-motion'
import clsx from 'clsx'

const variants = {
  primary:
    'bg-gradient-to-r from-brand-600 to-accent-500 text-white shadow-lg shadow-brand-600/25 hover:shadow-brand-600/40',
  ghost: 'bg-white/70 text-ink-900 border border-black/5 hover:bg-white',
  danger: 'bg-red-500 text-white shadow-lg shadow-red-500/25 hover:bg-red-600',
  subtle: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
}

export default function Button({
  children,
  variant = 'primary',
  className,
  disabled,
  type = 'button',
  ...props
}) {
  return (
    <motion.button
      type={type}
      whileHover={disabled ? {} : { scale: 1.03, y: -1 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      disabled={disabled}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  )
}
