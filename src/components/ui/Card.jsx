import { motion } from 'framer-motion'
import clsx from 'clsx'

export default function Card({ children, className, hover = false, delay = 0, ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={hover ? { y: -4, boxShadow: '0 20px 40px -12px rgba(79, 70, 229, 0.25)' } : {}}
      className={clsx(
        'glass rounded-2xl border border-black/5 shadow-sm shadow-black/[0.03] p-5',
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  )
}
